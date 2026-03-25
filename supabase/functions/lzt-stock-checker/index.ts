import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lztApiKey = Deno.env.get("LZT_API_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!lztApiKey) {
      return new Response(JSON.stringify({ error: "LZT_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only check accounts from categories with auto_import enabled
    const { data: activeCategories } = await supabase
      .from("lzt_categories")
      .select("id")
      .eq("auto_import", true);

    if (!activeCategories || activeCategories.length === 0) {
      return new Response(JSON.stringify({ checked: 0, removed: 0, priceUpdated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const categoryIds = activeCategories.map((c) => c.id);

    // Get all available accounts from active categories
    const { data: accounts } = await supabase
      .from("lzt_accounts")
      .select("id, lzt_item_id, category_id, price_usd, price_brl, data")
      .eq("status", "available")
      .in("category_id", categoryIds)
      .limit(200);

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ checked: 0, removed: 0, priceUpdated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get margin for each category
    const { data: categories } = await supabase
      .from("lzt_categories")
      .select("id, margin_percent")
      .in("id", categoryIds);

    const marginMap: Record<string, number> = {};
    categories?.forEach((c) => { marginMap[c.id] = c.margin_percent; });

    let removed = 0;
    let priceUpdated = 0;

    for (const account of accounts) {
      try {
        const res = await fetch(
          `https://api.lzt.market/${account.lzt_item_id}`,
          { headers: { Authorization: `Bearer ${lztApiKey}` } }
        );

        if (res.status === 404 || res.status === 410) {
          // Account no longer exists on LZT — delete from our DB
          await supabase.from("lzt_accounts").delete().eq("id", account.id);
          removed++;
        } else if (res.ok) {
          const data = await res.json();
          const item = data.item;

          if (!item || item.sold || item.status === "sold" || item.is_sold === true ||
              item.cancel_reason || item.status === "closed" || item.status === "banned") {
            // Account sold, closed, or banned — remove
            await supabase.from("lzt_accounts").delete().eq("id", account.id);
            removed++;
          } else {
            // Account still valid — check if price changed
            const newUsdPrice = item.price || 0;
            if (newUsdPrice !== account.price_usd && newUsdPrice > 0) {
              const margin = marginMap[account.category_id] || 30;
              const newBrlPrice = Math.round(newUsdPrice * 5.5 * (1 + margin / 100) * 100) / 100;

              await supabase
                .from("lzt_accounts")
                .update({
                  price_usd: newUsdPrice,
                  price_brl: newBrlPrice,
                  data: { ...((account.data as Record<string, unknown>) || {}), ...item, price_changed: true, previous_price_brl: account.price_brl },
                })
                .eq("id", account.id);
              priceUpdated++;
            }
          }
        }

        // Rate limiting — 500ms between requests
        await new Promise((r) => setTimeout(r, 500));
      } catch (_) {
        continue;
      }
    }

    return new Response(
      JSON.stringify({ checked: accounts.length, removed, priceUpdated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("LZT stock checker error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
