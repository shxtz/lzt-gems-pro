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
    const body = await req.json();
    const { orderId, type, test } = body;

    const webhookUrl = type === "delivery"
      ? Deno.env.get("DISCORD_WEBHOOK_DELIVERIES")
      : Deno.env.get("DISCORD_WEBHOOK_SALES");

    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: "Webhook URL not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let embed;

    if (test) {
      // Test mode - send a simple test embed
      embed = {
        title: "🧪 Teste de Webhook",
        description: "Esta é uma mensagem de teste enviada pelo painel admin.",
        color: 0xFFD700,
        timestamp: new Date().toISOString(),
        footer: { text: "VBUCKS BARATO • Teste" },
      };
    } else {
      // Real mode - fetch order from DB
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, serviceRoleKey);

      const { data: order } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (!order) {
        return new Response(JSON.stringify({ error: "Order not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Try to get buyer info
      let buyerName = "Desconhecido";
      if (order.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, email")
          .eq("user_id", order.user_id)
          .single();
        if (profile) {
          buyerName = profile.display_name || profile.email || "Desconhecido";
        }
      }

      const isSale = type !== "delivery";
      embed = {
        title: isSale ? "💰 Nova Venda" : "📦 Entrega Realizada",
        color: isSale ? 0xFFD700 : 0x00FF00,
        fields: [
          { name: "Pedido", value: order.id.slice(0, 8), inline: true },
          { name: "Valor", value: `R$ ${Number(order.total_price).toFixed(2)}`, inline: true },
          { name: "Comprador", value: buyerName, inline: true },
          { name: "Status", value: order.status, inline: true },
          { name: "Método", value: order.payment_method || "N/A", inline: true },
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "VBUCKS BARATO" },
      };
    }

    const discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds: [embed] }),
    });

    if (!discordRes.ok) {
      const errText = await discordRes.text();
      console.error("Discord webhook error:", errText);
      return new Response(JSON.stringify({ error: "Discord rejected webhook", details: errText }), {
        status: discordRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Discord sale webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error", message: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
