import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TERMINAL_STATES = new Set(["delivered", "refunded", "cancelled"]);

const KNOWN_ISPB_INSTITUTIONS: Record<string, string> = {
  "18236120": "NU PAGAMENTOS S.A. (Nubank)",
  "00360305": "CAIXA ECONÔMICA FEDERAL",
  "60701190": "ITAÚ UNIBANCO S.A.",
  "00000000": "BANCO DO BRASIL S.A.",
  "60746948": "BANCO BRADESCO S.A.",
  "33700394": "BANCO SANTANDER S.A.",
  "04902979": "BANCO INTER S.A.",
  "07679404": "BANCO ORIGINAL S.A.",
  "13140088": "C6 BANK S.A.",
  "10573521": "MERCADO PAGO",
  "26264220": "ASAAS GESTÃO FINANCEIRA",
  "11165756": "PAGSEGURO INTERNET S.A.",
  "16501555": "STONE PAGAMENTOS S.A.",
};

/** Extract payer info from EFI PIX webhook payload */
function extractPixPayerInfo(pixInfo: any) {
  const rawName =
    pixInfo?.gnExtras?.pagador?.nome ??
    pixInfo?.pagador?.nome ??
    pixInfo?.devedor?.nome ??
    null;

  const rawAlias = typeof pixInfo?.infoPagador === "string" ? pixInfo.infoPagador : null;

  const cleanName = typeof rawName === "string" ? rawName.trim() : "";
  const cleanAlias = typeof rawAlias === "string" ? rawAlias.trim() : "";
  const clientName =
    cleanName && cleanAlias && cleanAlias.toLowerCase() !== cleanName.toLowerCase()
      ? `${cleanName} (${cleanAlias})`
      : cleanName || cleanAlias || null;

  const clientDoc =
    pixInfo?.gnExtras?.pagador?.cpf ??
    pixInfo?.gnExtras?.pagador?.cnpj ??
    pixInfo?.devedor?.cpf ??
    pixInfo?.devedor?.cnpj ??
    pixInfo?.cpf ??
    pixInfo?.cnpj ??
    null;

  const rawBankCode =
    pixInfo?.gnExtras?.pagador?.codigoBanco ??
    pixInfo?.pagador?.codigoBanco ??
    null;
  const bankCode = typeof rawBankCode === "string" ? rawBankCode.replace(/\D/g, "") : null;

  const institution = bankCode ? (KNOWN_ISPB_INSTITUTIONS[bankCode] || `Código ${bankCode}`) : null;

  const pixKey = pixInfo?.chave ?? null;
  const e2eid = pixInfo?.endToEndId ?? pixInfo?.e2eid ?? null;

  return { clientName, clientDoc, bankCode, institution, pixKey, e2eid };
}

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
    if (response.status < 500 || response.status >= 600) return lastResult;

    console.warn(`${functionName} attempt ${attempt + 1} failed with status ${response.status}.`);
  }

  return lastResult;
}

/** Send rich Discord embed */
async function sendDiscordEmbed(webhookUrl: string, embeds: any[]) {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds }),
    });
  } catch (err) {
    console.error("Discord webhook error:", err);
  }
}

/** Get buyer profile info */
async function getBuyerInfo(supabase: any, userId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, email, discord_id")
    .eq("user_id", userId)
    .single();
  return data;
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

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_id", txid)
        .maybeSingle();

      if (orderError || !order) {
        console.log(`No order found for txid: ${txid}`);
        continue;
      }

      // ═══ IDEMPOTENCY GUARD ═══
      if (TERMINAL_STATES.has(order.status)) {
        console.log(`[IDEMPOTENCY] Order ${order.id} already in terminal state "${order.status}".`);
        continue;
      }
      if (order.status === "paid") {
        console.log(`[IDEMPOTENCY] Order ${order.id} already paid.`);
        continue;
      }

      // ═══ EXTRACT PIX PAYER INFO ═══
      const pixInfo = extractPixPayerInfo(payment);
      const now = new Date().toISOString();

      // ═══ PIX AMOUNT VALIDATION ═══
      const paidPixValue = payment.valor ? Number(payment.valor) : null;
      const expectedAmount = Number(order.total_price || 0);

      if (paidPixValue !== null && expectedAmount > 0 && paidPixValue < (expectedAmount - 0.01)) {
        console.error(`[SECURITY] PIX mismatch! Order ${order.id}: paid=${paidPixValue}, expected=${expectedAmount}`);

        await supabase
          .from("orders")
          .update({ status: "cancelled", updated_at: now })
          .eq("id", order.id)
          .eq("status", "pending");

        const discordUrl = Deno.env.get("DISCORD_WEBHOOK_SALES");
        if (discordUrl) {
          await sendDiscordEmbed(discordUrl, [{
            title: "⚠️ ALERTA: Manipulação de Preço",
            color: 0xFF0000,
            fields: [
              { name: "Pedido", value: order.id, inline: true },
              { name: "Pago", value: `R$ ${paidPixValue?.toFixed(2)}`, inline: true },
              { name: "Esperado", value: `R$ ${expectedAmount.toFixed(2)}`, inline: true },
              { name: "Cliente", value: pixInfo.clientName || "N/A", inline: true },
              { name: "Doc", value: pixInfo.clientDoc || "N/A", inline: true },
            ],
            timestamp: now,
          }]);
        }
        continue;
      }

      // ═══ MARK AS PAID + SAVE PIX INFO ═══
      const updatePayload: Record<string, any> = {
        status: "paid",
        updated_at: now,
      };
      if (pixInfo.e2eid) updatePayload.pix_e2eid = pixInfo.e2eid;
      if (pixInfo.clientName) updatePayload.pix_client_name = pixInfo.clientName;
      if (pixInfo.clientDoc) updatePayload.pix_client_doc = pixInfo.clientDoc;
      if (pixInfo.institution) updatePayload.pix_institution = pixInfo.institution;
      if (pixInfo.bankCode) updatePayload.pix_bank_code = pixInfo.bankCode;
      if (pixInfo.pixKey) updatePayload.pix_key = pixInfo.pixKey;

      const { error: updateError } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", order.id)
        .eq("status", "pending");

      if (updateError) {
        console.error(`Failed to update order ${order.id}:`, updateError);
        continue;
      }

      console.log(`Order ${order.id} marked as paid`);

      // ═══ GET BUYER PROFILE ═══
      const buyer = order.user_id ? await getBuyerInfo(supabase, order.user_id) : null;

      // ═══ SEND DISCORD: PAYMENT CONFIRMED ═══
      const discordSalesUrl = Deno.env.get("DISCORD_WEBHOOK_SALES");
      if (discordSalesUrl) {
        // Get product name
        let productName = "Produto";
        if (order.lzt_item_id) {
          const { data: lztAcc } = await supabase
            .from("lzt_accounts")
            .select("lzt_item_id")
            .eq("id", order.lzt_account_id)
            .maybeSingle();
          productName = lztAcc ? `LZT-${lztAcc.lzt_item_id}` : `LZT-${order.lzt_item_id}`;
        } else if (order.product_id) {
          const { data: prod } = await supabase.from("products").select("name").eq("id", order.product_id).maybeSingle();
          productName = prod?.name || "Produto";
        }

        const discordMention = buyer?.discord_id ? `<@${buyer.discord_id}>` : "N/A";
        const maskDoc = (doc: string) => {
          const c = doc.replace(/\D/g, "");
          if (c.length === 11) return `***.${c.slice(3,6)}.${c.slice(6,9)}-**`;
          if (c.length === 14) return `${c.slice(0,2)}.***.***/****-${c.slice(12)}`;
          return doc;
        };
        const nowBR = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const lztLink = order.lzt_item_id ? `\n[Ver no LZT](https://lzt.market/${order.lzt_item_id}/)` : "";

        await sendDiscordEmbed(discordSalesUrl, [{
          title: "💎 VBUCKS BARATO - Pagamentos | Compra aprovada",
          color: 0xFFD700,
          fields: [
            { name: "**ID PEDIDO:**", value: `\`${order.id}\``, inline: false },
            { name: "**PRODUTO:**", value: `${productName}${lztLink}`, inline: false },
            { name: "**COMPRADOR:**", value: `${buyer?.email || "N/A"}\n🆔 ID: \`${order.user_id || "N/A"}\`\n✨ Discord: ${discordMention}`, inline: false },
            { name: "**DATA/HORA:**", value: nowBR, inline: false },
            { name: "**METODO DE PAGAMENTO:**", value: order.payment_method === "balance" ? "Saldo" : "Pix - Efi Pay", inline: false },
            { name: "**INFORMAÇÕES ADICIONAIS:**", value: [
              `• Protocolo: \`${txid}\``,
              `• Email: ${buyer?.email || "N/A"}`,
              `• Cliente: ${pixInfo.clientName || "N/A"}`,
              `• Doc: ${pixInfo.clientDoc ? maskDoc(pixInfo.clientDoc) : "N/A"}`,
              `• Chave Pix: \`${pixInfo.pixKey || "N/A"}\``,
              `• Código Banco: ${pixInfo.bankCode || "N/A"}`,
              `• E2EID: \`${pixInfo.e2eid || "N/A"}\``,
              `• TXID: \`${txid}\``,
            ].join("\n"), inline: false },
            { name: "**TOTAL PAGO:**", value: `**R$ ${Number(order.total_price).toFixed(2).replace(".", ",")}**`, inline: false },
            { name: "Status", value: "✅ Compra aprovada", inline: true },
            { name: "Entrega", value: order.lzt_item_id ? "Automática (LZT)" : "Automática (credenciais)", inline: true },
          ],
          footer: { text: `VBUCKS BARATO • Pagamento confirmado • ${nowBR}` },
          timestamp: now,
        }]);
      }

      // ═══ DELIVERY: LZT ACCOUNT ═══
      let deliveredCredential: string | null = null;
      let deliverySuccess = false;

      if (order.lzt_item_id && order.lzt_account_id) {
        console.log(`Order ${order.id} is LZT — fast_buy for item #${order.lzt_item_id}`);

        const reservedCreds = order.lzt_reserved_credentials;
        const hasReserved = reservedCreds && (reservedCreds.login || reservedCreds.email || reservedCreds.password);

        try {
          const lztPayload: Record<string, any> = {
            action: "fast_buy",
            lzt_item_id: order.lzt_item_id,
            account_id: order.lzt_account_id,
            order_id: order.id,
            buyer_id: order.user_id,
            price_brl: order.total_price,
          };
          if (hasReserved) {
            lztPayload.use_reserved = true;
            lztPayload.reserved_credentials = reservedCreds;
          }

          const lztResult = await callWithRetry(supabaseUrl, serviceRoleKey, "lzt-purchase", lztPayload);

          if (lztResult.ok) {
            try {
              const lztData = JSON.parse(lztResult.bodyText);
              if (lztData.success) {
                deliverySuccess = true;
                deliveredCredential = lztData.credential || null;
                console.log(`LZT fast_buy SUCCESS for order ${order.id}`);
              } else {
                await markRefundNeeded(supabase, order.id);
              }
            } catch {
              await markRefundNeeded(supabase, order.id);
            }
          } else {
            const { data: postOrder } = await supabase.from("orders").select("status").eq("id", order.id).single();
            if (postOrder?.status === "delivered") {
              deliverySuccess = true;
            } else {
              console.error(`LZT FAILED for order ${order.id}:`, lztResult.bodyText);
              await markRefundNeeded(supabase, order.id);
            }
          }
        } catch (lztErr) {
          console.error(`LZT exception for order ${order.id}:`, lztErr);
          const { data: postOrder } = await supabase.from("orders").select("status").eq("id", order.id).single();
          if (postOrder?.status !== "delivered") {
            await markRefundNeeded(supabase, order.id);
          } else {
            deliverySuccess = true;
          }
        }
      }
      // ═══ DELIVERY: REGULAR PRODUCT ═══
      else if (order.product_id) {
        try {
          const deliverResult = await callWithRetry(supabaseUrl, serviceRoleKey, "deliver-product", {
            variationId: order.product_id,
            buyerId: order.user_id,
            orderId: order.id,
          }, 1, 1000);

          if (deliverResult.ok) {
            try {
              const deliverData = JSON.parse(deliverResult.bodyText);
              deliveredCredential = deliverData.credential || null;
            } catch {}

            await supabase.from("orders").update({
              status: "delivered",
              delivered_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", order.id);

            deliverySuccess = true;
            console.log(`Order ${order.id} delivered automatically`);
          } else {
            const { data: postOrder } = await supabase.from("orders").select("status").eq("id", order.id).single();
            if (postOrder?.status === "delivered") {
              deliverySuccess = true;
            } else {
              console.error(`Auto-delivery failed for order ${order.id}:`, deliverResult.bodyText);
            }
          }
        } catch (deliverErr) {
          console.error(`Auto-delivery exception for order ${order.id}:`, deliverErr);
        }
      }

      // ═══ SEND DISCORD: DELIVERY RESULT ═══
      const discordDeliveryUrl = Deno.env.get("DISCORD_WEBHOOK_DELIVERIES") || discordSalesUrl;
      if (discordDeliveryUrl && deliverySuccess) {
        // Get credential from delivery_logs if not returned directly
        if (!deliveredCredential) {
          const { data: log } = await supabase
            .from("delivery_logs")
            .select("credential_delivered")
            .eq("order_id", order.id)
            .order("delivered_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          deliveredCredential = log?.credential_delivered || null;
        }

        await sendDiscordEmbed(discordDeliveryUrl, [{
          title: "📦 Entrega Realizada",
          color: 0x00BFFF,
          fields: [
            { name: "Pedido", value: `\`${order.id}\``, inline: true },
            { name: "Valor", value: `R$ ${Number(order.total_price).toFixed(2)}`, inline: true },
            { name: "Cliente", value: `${pixInfo.clientName || "N/A"}${pixInfo.clientDoc ? ` (${pixInfo.clientDoc})` : ""}`, inline: true },
            { name: "Origem", value: order.lzt_item_id ? "LZT Market" : "Estoque", inline: true },
            { name: "Credenciais", value: deliveredCredential ? `\`\`\`${deliveredCredential.substring(0, 500)}\`\`\`` : "N/A", inline: false },
            { name: "Entrega", value: "✅ Automática", inline: true },
          ],
          footer: { text: "VBUCKS BARATO" },
          timestamp: new Date().toISOString(),
        }]);
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
  // Get order info for auto-refund
  const { data: order } = await supabase
    .from("orders")
    .select("user_id, total_price, status")
    .eq("id", orderId)
    .single();

  if (!order || order.status === "delivered") return;

  // Auto-refund to balance
  if (order.user_id && order.total_price) {
    const amount = Number(order.total_price);
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", order.user_id)
      .single();

    const newBalance = Number(profile?.balance || 0) + amount;
    await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("user_id", order.user_id);

    await supabase.from("balance_transactions").insert({
      user_id: order.user_id,
      amount: amount,
      type: "refund",
      description: `Reembolso automático - pedido #${orderId.slice(0, 8)}`,
    });

    await supabase
      .from("orders")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .neq("status", "delivered");

    console.log(`Auto-refunded R$${amount.toFixed(2)} to balance for order ${orderId}`);

    // Discord notification
    const discordUrl = Deno.env.get("DISCORD_WEBHOOK_SALES");
    if (discordUrl) {
      await sendDiscordEmbed(discordUrl, [{
        title: "🔄 Reembolso Automático em Saldo",
        color: 0xFF8C00,
        fields: [
          { name: "Pedido", value: `\`${orderId}\``, inline: true },
          { name: "Valor", value: `R$ ${amount.toFixed(2)}`, inline: true },
          { name: "Novo Saldo", value: `R$ ${newBalance.toFixed(2)}`, inline: true },
          { name: "Motivo", value: "Falha na entrega automática", inline: false },
        ],
        footer: { text: "VBUCKS BARATO" },
        timestamp: new Date().toISOString(),
      }]);
    }
  } else {
    // No user_id — just mark as refund_needed
    await supabase
      .from("orders")
      .update({ status: "refund_needed", updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .neq("status", "delivered");
  }
}
