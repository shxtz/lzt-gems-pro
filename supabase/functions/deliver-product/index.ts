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

    // ═══ AUTHENTICATION: Only service_role or admin can call this ═══
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const isServiceRole = token === serviceRoleKey;

    if (!isServiceRole) {
      // Verify admin role
      const { data: userData } = await supabase.auth.getUser(token);
      if (!userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .eq("role", "admin")
        .single();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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
      .eq("status", "available")
      .select()
      .single();

    if (updateError || !updated) {
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
  } catch (err: any) {
    console.error("Deliver product error:", err.message);
    return new Response(
      JSON.stringify({ error: "Erro interno ao entregar produto" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
