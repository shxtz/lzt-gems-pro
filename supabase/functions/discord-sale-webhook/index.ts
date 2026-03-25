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
    const { orderId, type } = await req.json();
    const webhookUrl = type === "delivery"
      ? Deno.env.get("DISCORD_WEBHOOK_DELIVERIES")
      : Deno.env.get("DISCORD_WEBHOOK_SALES");

    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "Webhook URL not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: order } = await supabase
      .from("orders")
      .select("*, profiles!orders_user_id_fkey(display_name, email)")
      .eq("id", orderId)
      .single();

    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSale = type !== "delivery";
    const embed = {
      title: isSale ? "💰 Nova Venda" : "📦 Entrega Realizada",
      color: isSale ? 0xFFD700 : 0x00FF00,
      fields: [
        { name: "Pedido", value: order.id.slice(0, 8), inline: true },
        { name: "Valor", value: `R$ ${Number(order.total_price).toFixed(2)}`, inline: true },
        { name: "Status", value: order.status, inline: true },
        { name: "Método", value: order.payment_method || "N/A", inline: true },
      ],
      timestamp: new Date().toISOString(),
      footer: { text: "VBUCKS BARATO" },
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Discord sale webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
