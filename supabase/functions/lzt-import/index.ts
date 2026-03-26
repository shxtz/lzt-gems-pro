import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LZT_API_BASE = "https://api.lzt.market";

// ═══ ADMIN AUTH HELPER ═══
async function verifyAdminOrService(req: Request, supabase: any, serviceRoleKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = authHeader.replace("Bearer ", "");
  if (token === serviceRoleKey) return; // service_role is always allowed
  
  const { data: userData } = await supabase.auth.getUser(token);
  if (!userData?.user) throw new Error("Unauthorized");
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userData.user.id)
    .eq("role", "admin")
    .single();
  if (!roleData) throw new Error("Forbidden");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const lztApiKey = Deno.env.get("LZT_API_KEY");

  if (!lztApiKey) {
    return new Response(
      JSON.stringify({ error: "LZT_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const { action, category_id, api_url, lzt_item_id, margin_percent } = await req.json();

    // Auto-import: fetch all categories with auto_import enabled
    if (action === "auto_import") {
      const { data: categories } = await supabase
        .from("lzt_categories")
        .select("*")
        .eq("auto_import", true);

      if (!categories || categories.length === 0) {
        return new Response(
          JSON.stringify({ message: "No categories with auto_import enabled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      for (const cat of categories) {
        if (!cat.api_url) continue;
        const result = await importFromUrl(supabase, lztApiKey, cat.id, cat.api_url, cat.margin_percent, cat.account_limit);
        results.push({ category: cat.name, ...result });
        
        await supabase
          .from("lzt_categories")
          .update({ last_import_at: new Date().toISOString() })
          .eq("id", cat.id);
      }

      return new Response(
        JSON.stringify({ results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Manual search from URL
    if (action === "search") {
      const data = await fetchLztUrl(lztApiKey, api_url);
      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Import from URL into a category
    if (action === "import") {
      const result = await importFromUrl(supabase, lztApiKey, category_id, api_url, margin_percent || 30, 300);
      
      await supabase
        .from("lzt_categories")
        .update({ last_import_at: new Date().toISOString() })
        .eq("id", category_id);

      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Import single account by LZT ID
    if (action === "import_single") {
      const res = await fetch(`${LZT_API_BASE}/${lzt_item_id}`, {
        headers: { Authorization: `Bearer ${lztApiKey}` },
      });
      const data = await res.json();

      if (!data.item) {
        return new Response(
          JSON.stringify({ error: "Account not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const item = data.item;
      const rawPrice = item.price || 0;
      const currency = (item.price_currency || item.priceCurrency || "usd").toLowerCase();
      const isBrl = currency === "brl" || currency === "rub_brl" || currency === "r$";
      const baseBrl = isBrl ? rawPrice : rawPrice * 5.5;
      const brlPrice = baseBrl * (1 + (margin_percent || 30) / 100);
      const usdPrice = rawPrice;

      const { error } = await supabase.from("lzt_accounts").upsert(
        {
          category_id,
          lzt_item_id: String(item.item_id),
          title: item.title || `Account #${item.item_id}`,
          price_usd: usdPrice,
          price_brl: Math.round(brlPrice * 100) / 100,
          data: item,
          status: "available",
        },
        { onConflict: "lzt_item_id" }
      );

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, imported: 1 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear accounts for a category
    if (action === "clear") {
      const { error } = await supabase
        .from("lzt_accounts")
        .delete()
        .eq("category_id", category_id)
        .eq("status", "available");

      return new Response(
        JSON.stringify({ success: !error }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clear ALL accounts
    if (action === "clear_all") {
      const { error } = await supabase
        .from("lzt_accounts")
        .delete()
        .eq("status", "available");

      return new Response(
        JSON.stringify({ success: !error }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("LZT Import error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function fetchLztUrl(apiKey: string, url: string) {
  // Convert full URL to API path if needed
  let apiUrl = url;
  if (url.startsWith("https://prod-api.lzt.market")) {
    apiUrl = url;
  } else if (url.startsWith("https://lzt.market")) {
    apiUrl = url.replace("https://lzt.market", LZT_API_BASE);
  } else if (!url.startsWith("http")) {
    apiUrl = `${LZT_API_BASE}/${url}`;
  }

  const res = await fetch(apiUrl, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return await res.json();
}

async function importFromUrl(
  supabase: any,
  apiKey: string,
  categoryId: string,
  url: string,
  marginPercent: number,
  limit: number
) {
  // Get current count
  const { count } = await supabase
    .from("lzt_accounts")
    .select("*", { count: "exact", head: true })
    .eq("category_id", categoryId)
    .eq("status", "available");

  const currentCount = count || 0;
  if (currentCount >= limit) {
    return { imported: 0, message: "Limit reached" };
  }

  const data = await fetchLztUrl(apiKey, url);

  if (!data.items || !Array.isArray(data.items)) {
    return { imported: 0, message: "No items found", raw: data };
  }

  let imported = 0;
  let skipped = 0;
  const remaining = limit - currentCount;
  const itemsToImport = data.items.slice(0, remaining);

  for (const item of itemsToImport) {
    const lztItemId = String(item.item_id);
    const rawPrice = item.price || 0;
    const currency = (item.price_currency || item.priceCurrency || "usd").toLowerCase();
    const isBrl = currency === "brl" || currency === "rub_brl" || currency === "r$";
    const baseBrl = isBrl ? rawPrice : rawPrice * 5.5;
    const usdPrice = rawPrice;
    const brlPrice = Math.round(baseBrl * (1 + marginPercent / 100) * 100) / 100;

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
      }
      skipped++;
      continue;
    }

    // Insert new
    const { error } = await supabase.from("lzt_accounts").insert({
      category_id: categoryId,
      lzt_item_id: lztItemId,
      title: item.title || `Account #${item.item_id}`,
      price_usd: usdPrice,
      price_brl: brlPrice,
      data: item,
      status: "available",
    });

    if (!error) imported++;
  }

  return { imported, skipped, total: data.items.length };
}
