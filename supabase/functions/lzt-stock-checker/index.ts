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

    // Get all available LZT accounts
    const { data: accounts } = await supabase
      .from("lzt_accounts")
      .select("id, lzt_item_id, category_id")
      .eq("status", "available")
      .limit(100);

    if (!accounts || accounts.length === 0) {
      return new Response(JSON.stringify({ checked: 0, invalidated: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let invalidated = 0;

    for (const account of accounts) {
      try {
        const res = await fetch(
          `https://api.lzt.market/${account.lzt_item_id}`,
          {
            headers: { Authorization: `Bearer ${lztToken}` },
          }
        );

        if (res.status === 404 || res.status === 410) {
          // Item no longer exists
          await supabase
            .from("lzt_accounts")
            .update({ status: "unavailable" })
            .eq("id", account.id);
          invalidated++;
        } else if (res.ok) {
          const data = await res.json();
          if (data.item?.sold || data.item?.status === "sold") {
            await supabase
              .from("lzt_accounts")
              .update({ status: "unavailable" })
              .eq("id", account.id);
            invalidated++;
          }
        }

        // Rate limiting
        await new Promise((r) => setTimeout(r, 500));
      } catch (_) {
        continue;
      }
    }

    return new Response(
      JSON.stringify({ checked: accounts.length, invalidated }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("LZT stock checker error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
