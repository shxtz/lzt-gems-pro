import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    if (!userData.user) throw new Error("Unauthorized");
    const userId = userData.user.id;

    const { orderId } = await req.json();
    if (!orderId) throw new Error("orderId obrigatório");

    // Get order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", userId)
      .eq("status", "pending")
      .single();
    if (orderError || !order) throw new Error("Pedido não encontrado ou já processado");

    const amount = Number(order.total_price);

    // Get user balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", userId)
      .single();
    const balance = Number(profile?.balance || 0);

    if (balance < amount) {
      return new Response(JSON.stringify({ error: "Saldo insuficiente", balance, required: amount }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduct balance
    const newBalance = balance - amount;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("user_id", userId);
    if (updateError) throw updateError;

    // Record transaction
    await supabase.from("balance_transactions").insert({
      user_id: userId,
      amount: -amount,
      type: "purchase",
      description: `Compra pedido #${orderId.slice(0, 8)}`,
    });

    // Update order to paid
    await supabase
      .from("orders")
      .update({ status: "paid", payment_method: "balance", payment_id: `balance-${Date.now()}` })
      .eq("id", orderId);

    // Trigger delivery — call deliver-product or lzt-purchase depending on order type
    let deliveryResult: any = null;

    if (order.lzt_item_id) {
      // LZT account purchase
      try {
        const lztRes = await fetch(`${supabaseUrl}/functions/v1/lzt-purchase`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            action: "fast_buy",
            lzt_item_id: order.lzt_item_id,
            order_id: orderId,
            user_id: userId,
            use_reserved: !!order.lzt_reserved_credentials,
            reserved_credentials: order.lzt_reserved_credentials,
          }),
        });
        deliveryResult = await lztRes.json();
      } catch (e) {
        console.error("LZT purchase error:", e);
        // Mark as refund_needed
        await supabase.from("orders").update({ status: "refund_needed" }).eq("id", orderId);
        // Refund balance
        await supabase.from("profiles").update({ balance: balance }).eq("user_id", userId);
        await supabase.from("balance_transactions").insert({
          user_id: userId,
          amount: amount,
          type: "refund",
          description: `Reembolso - falha entrega pedido #${orderId.slice(0, 8)}`,
        });
        return new Response(JSON.stringify({ paid: true, delivered: false, error: "Falha na entrega, saldo reembolsado" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (order.variation_id || order.product_id) {
      // Stock product
      try {
        const deliverRes = await fetch(`${supabaseUrl}/functions/v1/deliver-product`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            orderId: orderId,
            variationId: order.variation_id || order.product_id,
          }),
        });
        deliveryResult = await deliverRes.json();
      } catch (e) {
        console.error("Delivery error:", e);
      }
    }

    const delivered = deliveryResult?.success || deliveryResult?.delivered;
    const credential = deliveryResult?.credential || deliveryResult?.credentials;

    return new Response(JSON.stringify({
      paid: true,
      delivered: !!delivered,
      credential: credential || null,
      newBalance,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const status = err.message === "Unauthorized" ? 401 : 400;
    return new Response(JSON.stringify({ error: err.message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
