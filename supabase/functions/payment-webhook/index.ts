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

    const body = await req.json();
    const { pix } = body;

    if (!pix || !Array.isArray(pix) || pix.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid webhook payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    for (const payment of pix) {
      const txid = payment.txid;
      if (!txid) continue;

      console.log(`Processing payment webhook for txid: ${txid}`);

      // Find the order by payment_id (txid)
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_id", txid)
        .eq("status", "pending")
        .single();

      if (orderError || !order) {
        console.log(`No pending order found for txid: ${txid}`);
        continue;
      }

      // Update order status to paid
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: "paid",
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id);

      if (updateError) {
        console.error(`Failed to update order ${order.id}:`, updateError);
        continue;
      }

      console.log(`Order ${order.id} marked as paid`);

      // ═══════════════════════════════════════════════════════
      // LZT ACCOUNT: Buy from LZT Market after payment confirmed
      // ═══════════════════════════════════════════════════════
      if (order.lzt_item_id && order.lzt_account_id) {
        console.log(`Order ${order.id} is LZT account — executing fast_buy for item #${order.lzt_item_id}`);
        try {
          const lztResult = await fetch(`${supabaseUrl}/functions/v1/lzt-purchase`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              action: "fast_buy",
              lzt_item_id: order.lzt_item_id,
              account_id: order.lzt_account_id,
              order_id: order.id,
              buyer_id: order.user_id,
              price_brl: order.total_price,
            }),
          });

          const lztData = await lztResult.json();

          if (lztData.success) {
            console.log(`LZT fast_buy SUCCESS for order ${order.id}`);
          } else if (lztData.needsRefund) {
            console.error(`LZT fast_buy FAILED for order ${order.id}, needs refund:`, lztData.error);
            await supabase.from("orders").update({
              status: "refund_needed",
              updated_at: new Date().toISOString(),
            }).eq("id", order.id);
          } else {
            console.error(`LZT fast_buy error for order ${order.id}:`, lztData.error);
            await supabase.from("orders").update({
              status: "refund_needed",
              updated_at: new Date().toISOString(),
            }).eq("id", order.id);
          }
        } catch (lztErr) {
          console.error(`LZT fast_buy exception for order ${order.id}:`, lztErr);
          await supabase.from("orders").update({
            status: "refund_needed",
            updated_at: new Date().toISOString(),
          }).eq("id", order.id);
        }
      }
      // ═══════════════════════════════════════════════════════
      // REGULAR PRODUCT: Deliver from stock
      // ═══════════════════════════════════════════════════════
      else if (order.product_id) {
        try {
          const deliverResponse = await fetch(`${supabaseUrl}/functions/v1/deliver-product`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceRoleKey}`,
            },
            body: JSON.stringify({
              variationId: order.product_id,
              buyerId: order.user_id,
              orderId: order.id,
            }),
          });

          if (deliverResponse.ok) {
            await supabase
              .from("orders")
              .update({ status: "delivered", updated_at: new Date().toISOString() })
              .eq("id", order.id);
            console.log(`Order ${order.id} delivered automatically`);
          }
        } catch (deliverErr) {
          console.error(`Auto-delivery failed for order ${order.id}:`, deliverErr);
        }
      }

      // Send Discord notification
      const discordWebhookUrl = Deno.env.get("DISCORD_WEBHOOK_SALES");
      if (discordWebhookUrl) {
        try {
          const orderType = order.lzt_item_id ? "Conta LZT" : "Produto";
          await fetch(discordWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              embeds: [{
                title: "💰 Nova Venda Confirmada",
                color: 0xFFD700,
                fields: [
                  { name: "Pedido", value: order.id, inline: true },
                  { name: "Valor", value: `R$ ${Number(order.total_price).toFixed(2)}`, inline: true },
                  { name: "Tipo", value: orderType, inline: true },
                  { name: "Status", value: "Pago ✅", inline: true },
                ],
                timestamp: new Date().toISOString(),
              }],
            }),
          });
        } catch (discordErr) {
          console.error("Discord webhook error:", discordErr);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Payment webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
