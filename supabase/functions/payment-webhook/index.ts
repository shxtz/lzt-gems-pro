import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Terminal states that must NEVER be overwritten by duplicate webhooks */
const TERMINAL_STATES = new Set(["delivered", "refunded", "cancelled"]);

/** Retry an internal function call on 5xx errors */
async function callWithRetry(
  supabaseUrl: string,
  serviceRoleKey: string,
  functionName: string,
  payload: Record<string, unknown>,
  maxRetries = 2,
  baseDelayMs = 1500,
): Promise<{ ok: boolean; status: number; bodyText: string }> {
  let lastResult = { ok: false, status: 0, bodyText: "" };

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = baseDelayMs * attempt;
      console.log(`Retry attempt ${attempt}/${maxRetries} for ${functionName}, waiting ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const response = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify(payload),
    });

    const bodyText = await response.text();
    lastResult = { ok: response.ok, status: response.status, bodyText };

    if (response.ok) return lastResult;

    // Only retry on 5xx (server errors / temporary outages)
    if (response.status < 500 || response.status >= 600) {
      console.log(`${functionName} returned non-retryable status ${response.status}, giving up.`);
      return lastResult;
    }

    console.warn(`${functionName} attempt ${attempt + 1} failed with status ${response.status}.`);
  }

  return lastResult;
}

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
        .maybeSingle();

      if (orderError || !order) {
        console.log(`No order found for txid: ${txid}`);
        continue;
      }

      // ══════════════════════════════════════════════════════════════════
      // IDEMPOTENCY GUARD — Prevent duplicate webhook processing.
      // EFI Bank often fires the same webhook 2-3 times for the same payment.
      // Terminal states must NEVER be overwritten.
      // ══════════════════════════════════════════════════════════════════
      if (TERMINAL_STATES.has(order.status)) {
        console.log(`[IDEMPOTENCY] Order ${order.id} is already in terminal state "${order.status}". Ignoring duplicate webhook.`);
        continue;
      }

      // Skip if already paid (might be processing delivery)
      if (order.status === "paid") {
        console.log(`[IDEMPOTENCY] Order ${order.id} is already paid. Skipping.`);
        continue;
      }

      // ══════════════════════════════════════════════════════════════════
      // SECURITY: Validate that the paid PIX amount matches expected amount.
      // Prevents price manipulation scenarios.
      // ══════════════════════════════════════════════════════════════════
      const paidPixValue = payment.valor ? Number(payment.valor) : null;
      const expectedAmount = Number(order.total_price || 0);

      if (paidPixValue !== null && expectedAmount > 0 && paidPixValue < (expectedAmount - 0.01)) {
        console.error(
          `[SECURITY] PIX amount mismatch! Order ${order.id}: paid=${paidPixValue}, expected=${expectedAmount}. Possible price manipulation.`
        );

        await supabase
          .from("orders")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", order.id)
          .eq("status", "pending");

        // Notify via Discord
        const discordWebhookUrl = Deno.env.get("DISCORD_WEBHOOK_SALES");
        if (discordWebhookUrl) {
          try {
            await fetch(discordWebhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                embeds: [{
                  title: "⚠️ ALERTA: Manipulação de Preço Detectada",
                  color: 0xFF0000,
                  fields: [
                    { name: "Pedido", value: order.id, inline: true },
                    { name: "Pago", value: `R$ ${paidPixValue?.toFixed(2)}`, inline: true },
                    { name: "Esperado", value: `R$ ${expectedAmount.toFixed(2)}`, inline: true },
                    { name: "Status", value: "❌ Cancelado automaticamente", inline: false },
                  ],
                  timestamp: new Date().toISOString(),
                }],
              }),
            });
          } catch (_) {}
        }
        continue;
      }

      // Save e2eid and mark as paid — only if still pending (atomic guard)
      const e2eid = payment.endToEndId || payment.e2eid || null;
      const updatePayload: Record<string, any> = {
        status: "paid",
        updated_at: new Date().toISOString(),
      };
      if (e2eid) updatePayload.pix_e2eid = e2eid;

      const { error: updateError } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", order.id)
        .eq("status", "pending"); // Only update if still pending

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

        // Check if we have pre-reserved credentials
        const reservedCreds = order.lzt_reserved_credentials;
        const hasReservedCreds = reservedCreds && (reservedCreds.login || reservedCreds.email || reservedCreds.password);

        try {
          let lztResult;

          if (hasReservedCreds) {
            // Happy path: use pre-reserved credentials (already purchased before PIX)
            console.log(`[payment-webhook] Using pre-reserved LZT credentials for order ${order.id}`);
            lztResult = await callWithRetry(supabaseUrl, serviceRoleKey, "lzt-purchase", {
              action: "fast_buy",
              lzt_item_id: order.lzt_item_id,
              account_id: order.lzt_account_id,
              order_id: order.id,
              buyer_id: order.user_id,
              price_brl: order.total_price,
              use_reserved: true,
              reserved_credentials: reservedCreds,
            });
          } else {
            // Standard path: buy from LZT now (with retry on 5xx)
            lztResult = await callWithRetry(supabaseUrl, serviceRoleKey, "lzt-purchase", {
              action: "fast_buy",
              lzt_item_id: order.lzt_item_id,
              account_id: order.lzt_account_id,
              order_id: order.id,
              buyer_id: order.user_id,
              price_brl: order.total_price,
            });
          }

          if (lztResult.ok) {
            let lztData;
            try { lztData = JSON.parse(lztResult.bodyText); } catch { lztData = {}; }

            if (lztData.success) {
              console.log(`LZT fast_buy SUCCESS for order ${order.id}`);
            } else {
              console.error(`LZT fast_buy returned ok but not success for order ${order.id}:`, lztResult.bodyText);
              await markRefundNeeded(supabase, order.id);
            }
          } else {
            // Before marking as failed, check if order was actually delivered (race condition safety)
            const { data: postOrder } = await supabase
              .from("orders")
              .select("status")
              .eq("id", order.id)
              .single();

            if (postOrder?.status === "delivered") {
              console.log(`[payment-webhook] LZT returned error but order ${order.id} is already delivered — treating as success`);
            } else {
              console.error(`LZT fast_buy FAILED for order ${order.id}:`, lztResult.bodyText);
              await markRefundNeeded(supabase, order.id);
            }
          }
        } catch (lztErr) {
          console.error(`LZT fast_buy exception for order ${order.id}:`, lztErr);

          // Check if delivered despite exception
          const { data: postOrder } = await supabase
            .from("orders")
            .select("status")
            .eq("id", order.id)
            .single();

          if (postOrder?.status !== "delivered") {
            await markRefundNeeded(supabase, order.id);
          }
        }
      }
      // ═══════════════════════════════════════════════════════
      // REGULAR PRODUCT: Deliver from stock (with retry)
      // ═══════════════════════════════════════════════════════
      else if (order.product_id) {
        try {
          const deliverResult = await callWithRetry(supabaseUrl, serviceRoleKey, "deliver-product", {
            variationId: order.product_id,
            buyerId: order.user_id,
            orderId: order.id,
          }, 1, 1000); // 1 retry, 1s delay

          if (deliverResult.ok) {
            await supabase
              .from("orders")
              .update({ status: "delivered", updated_at: new Date().toISOString() })
              .eq("id", order.id);
            console.log(`Order ${order.id} delivered automatically`);
          } else {
            // Check if delivered despite error response
            const { data: postOrder } = await supabase
              .from("orders")
              .select("status")
              .eq("id", order.id)
              .single();

            if (postOrder?.status !== "delivered") {
              console.error(`Auto-delivery failed for order ${order.id}:`, deliverResult.bodyText);
            }
          }
        } catch (deliverErr) {
          console.error(`Auto-delivery exception for order ${order.id}:`, deliverErr);
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

async function markRefundNeeded(supabase: any, orderId: string) {
  await supabase
    .from("orders")
    .update({ status: "refund_needed", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .neq("status", "delivered"); // NEVER overwrite a delivered order
}
