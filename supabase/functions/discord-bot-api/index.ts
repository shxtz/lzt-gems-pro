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
    // Validate API key for bot access
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("DISCORD_BOT_API_KEY");

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    switch (action) {
      case "get-user-by-discord": {
        const discordId = url.searchParams.get("discord_id");
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("discord_id", discordId)
          .single();
        return new Response(JSON.stringify({ user: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-user-orders": {
        const userId = url.searchParams.get("user_id");
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);
        return new Response(JSON.stringify({ orders: data }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      case "get-stats": {
        const { count: totalOrders } = await supabase
          .from("orders")
          .select("*", { count: "exact", head: true })
          .eq("status", "delivered");

        const { data: revenue } = await supabase
          .from("orders")
          .select("total_price")
          .in("status", ["paid", "delivered"]);

        const totalRevenue = revenue?.reduce((sum, o) => sum + Number(o.total_price), 0) || 0;

        return new Response(JSON.stringify({ totalOrders, totalRevenue }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (err) {
    console.error("Discord bot API error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
