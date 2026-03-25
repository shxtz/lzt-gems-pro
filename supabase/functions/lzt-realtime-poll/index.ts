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
    const lztToken = Deno.env.get("LZT_API_TOKEN");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    if (!lztToken) {
      return new Response(JSON.stringify({ error: "LZT token not configured" }), {
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

    for (const category of categories) {
      try {
        // Call lzt-import for each category
        const res = await fetch(`${supabaseUrl}/functions/v1/lzt-import`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({ categoryId: category.id }),
        });

        if (res.ok) {
          const result = await res.json();
          totalImported += result.imported || 0;
        }

        // Update last import timestamp
        await supabase
          .from("lzt_categories")
          .update({ last_import_at: new Date().toISOString() })
          .eq("id", category.id);

        // Rate limit between categories
        await new Promise((r) => setTimeout(r, 2000));
      } catch (_) {
        continue;
      }
    }

    return new Response(
      JSON.stringify({ imported: totalImported, categories: categories.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("LZT realtime poll error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
