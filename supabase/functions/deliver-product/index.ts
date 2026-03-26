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

    const { variationId, buyerId, orderId } = await req.json();

    if (!variationId || !buyerId) {
      return new Response(
        JSON.stringify({ error: "variationId and buyerId are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find an available stock item and lock it
    const { data: stockItem, error: stockError } = await supabase
      .from("product_stock")
      .select("*")
      .eq("variation_id", variationId)
      .eq("status", "available")
      .limit(1)
      .single();

    if (stockError || !stockItem) {
      return new Response(
        JSON.stringify({ error: "Produto sem estoque disponível", code: "OUT_OF_STOCK" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as sold (atomic update with status check to prevent race conditions)
    const { data: updated, error: updateError } = await supabase
      .from("product_stock")
      .update({
        status: "sold",
        sold_at: new Date().toISOString(),
        buyer_id: buyerId,
        order_id: orderId || null,
      })
      .eq("id", stockItem.id)
      .eq("status", "available") // Ensure it's still available (prevents double-selling)
      .select()
      .single();

    if (updateError || !updated) {
      // Race condition: item was sold between select and update
      return new Response(
        JSON.stringify({ error: "Item já foi vendido. Tente novamente.", code: "RACE_CONDITION" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create delivery log
    await supabase.from("delivery_logs").insert({
      order_id: orderId || null,
      stock_id: stockItem.id,
      variation_id: variationId,
      buyer_id: buyerId,
      credential_delivered: stockItem.credential,
    });

    // Send delivery email to buyer
    try {
      // Get buyer email and product info
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", buyerId)
        .single();

      const { data: variation } = await supabase
        .from("product_variations")
        .select("name, price, product_id, products(name)")
        .eq("id", variationId)
        .single();

      const { data: order } = orderId
        ? await supabase.from("orders").select("total_price").eq("id", orderId).single()
        : { data: null };

      if (profile?.email) {
        const productName = (variation as any)?.products?.name
          ? `${(variation as any).products.name} — ${variation?.name}`
          : variation?.name || "Produto";

        const totalPrice = order?.total_price
          ? Number(order.total_price).toFixed(2).replace(".", ",")
          : variation?.price
            ? Number(variation.price).toFixed(2).replace(".", ",")
            : undefined;

        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "delivery-confirmation",
            recipientEmail: profile.email,
            idempotencyKey: `delivery-${orderId || stockItem.id}`,
            templateData: {
              productName,
              credential: stockItem.credential,
              orderId: orderId || stockItem.id,
              totalPrice,
            },
          },
        });
        console.log(`[DELIVERY EMAIL] Sent to ${profile.email} for order ${orderId}`);
      }
    } catch (emailErr) {
      // Non-fatal: log but don't fail the delivery
      console.error("Failed to send delivery email:", emailErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        credential: stockItem.credential,
        credential_type: "delivered",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Deliver product error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno ao entregar produto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
