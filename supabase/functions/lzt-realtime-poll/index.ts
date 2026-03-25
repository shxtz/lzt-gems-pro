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

    // Get categories with auto_import enabled
    const { data: categories } = await supabase
      .from("lzt_categories")
      .select("*")
      .eq("auto_import", true);

    if (!categories || categories.length === 0) {
      return new Response(JSON.stringify({ imported: 0, message: "No auto-import categories" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let totalImported = 0;
    let totalUpdated = 0;

    for (const category of categories) {
      if (!category.api_url) continue;

      try {
        // Fetch accounts from LZT API
        let apiUrl = category.api_url;
        if (apiUrl.startsWith("https://lzt.market")) {
          apiUrl = apiUrl.replace("https://lzt.market", "https://api.lzt.market");
        } else if (!apiUrl.startsWith("http")) {
          apiUrl = `https://api.lzt.market/${apiUrl}`;
        }

        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${lztApiKey}` },
        });

        if (!res.ok) {
          await res.text();
          continue;
        }

        const data = await res.json();
        if (!data.items || !Array.isArray(data.items)) continue;

        // Get current count
        const { count } = await supabase
          .from("lzt_accounts")
          .select("*", { count: "exact", head: true })
          .eq("category_id", category.id)
          .eq("status", "available");

        const currentCount = count || 0;
        const remaining = category.account_limit - currentCount;
        if (remaining <= 0) continue;

        const itemsToProcess = data.items.slice(0, remaining);

        for (const item of itemsToProcess) {
          const lztItemId = String(item.item_id);
          const usdPrice = item.price || 0;
          const brlPrice = Math.round(usdPrice * 5.5 * (1 + category.margin_percent / 100) * 100) / 100;

          // Check if already exists
          const { data: existing } = await supabase
            .from("lzt_accounts")
            .select("id, price_usd, price_brl")
            .eq("lzt_item_id", lztItemId)
            .maybeSingle();

          if (existing) {
            // Update price if changed
            if (existing.price_usd !== usdPrice && usdPrice > 0) {
              await supabase
                .from("lzt_accounts")
                .update({
                  price_usd: usdPrice,
                  price_brl: brlPrice,
                  data: { ...item, price_changed: true, previous_price_brl: existing.price_brl },
                })
                .eq("id", existing.id);
              totalUpdated++;
            }
            // Skip duplicate
            continue;
          }

          // Insert new account
          const { error } = await supabase.from("lzt_accounts").insert({
            category_id: category.id,
            lzt_item_id: lztItemId,
            title: item.title || `Account #${item.item_id}`,
            price_usd: usdPrice,
            price_brl: brlPrice,
            data: item,
            status: "available",
          });

          if (!error) totalImported++;
        }

        // Update last import timestamp
        await supabase
          .from("lzt_categories")
          .update({ last_import_at: new Date().toISOString() })
          .eq("id", category.id);

        // Rate limit between categories
        await new Promise((r) => setTimeout(r, 1000));
      } catch (_) {
        continue;
      }
    }

    // Also run stock checker inline — validate existing accounts
    let removed = 0;
    const { data: activeIds } = await supabase
      .from("lzt_categories")
      .select("id")
      .eq("auto_import", true);

    if (activeIds && activeIds.length > 0) {
      const catIds = activeIds.map((c) => c.id);
      const { data: accounts } = await supabase
        .from("lzt_accounts")
        .select("id, lzt_item_id, category_id, price_usd, price_brl")
        .eq("status", "available")
        .in("category_id", catIds)
        .limit(50);

      if (accounts) {
        for (const account of accounts) {
          try {
            const res = await fetch(`https://api.lzt.market/${account.lzt_item_id}`, {
              headers: { Authorization: `Bearer ${lztApiKey}` },
            });

            if (res.status === 404 || res.status === 410) {
              await supabase.from("lzt_accounts").delete().eq("id", account.id);
              removed++;
            } else if (res.ok) {
              const d = await res.json();
              const item = d.item;
              if (!item || item.sold || item.is_sold || item.status === "sold" || item.status === "closed" || item.status === "banned") {
                await supabase.from("lzt_accounts").delete().eq("id", account.id);
                removed++;
              }
            } else {
              await res.text();
            }

            await new Promise((r) => setTimeout(r, 500));
          } catch (_) {
            continue;
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ imported: totalImported, updated: totalUpdated, removed, categories: categories.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("LZT realtime poll error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
