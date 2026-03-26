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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find pending orders older than 30 minutes
    const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: expiredOrders, error } = await supabase
      .from("orders")
      .select("id, created_at, total_price, user_id, lzt_account_id")
      .eq("status", "pending")
      .lt("created_at", cutoff)
      .limit(50);

    if (error) {
      console.error("Error fetching expired orders:", error);
      return new Response(JSON.stringify({ error: "Query failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      return new Response(JSON.stringify({ cancelled: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let cancelled = 0;
    const now = new Date().toISOString();

    for (const order of expiredOrders) {
      // Cancel the order
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ status: "cancelled", updated_at: now })
        .eq("id", order.id)
        .eq("status", "pending");

      if (updateErr) {
        console.error(`Failed to cancel order ${order.id}:`, updateErr);
        continue;
      }

      // Release LZT account back to available if reserved
      if (order.lzt_account_id) {
        await supabase
          .from("lzt_accounts")
          .update({ status: "available", buyer_id: null, sold_at: null })
          .eq("id", order.lzt_account_id)
          .eq("status", "reserved");
      }

      cancelled++;
      console.log(`Cancelled expired order ${order.id} (created ${order.created_at})`);
    }

    console.log(`Cancelled ${cancelled} expired orders`);

    return new Response(JSON.stringify({ cancelled }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Cancel expired orders error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
