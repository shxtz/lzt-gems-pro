import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LZT_API = "https://api.lzt.market";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lztApiKey = Deno.env.get("LZT_API_KEY");
    if (!lztApiKey) {
      return new Response(JSON.stringify({ error: "LZT_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, lzt_item_id, account_id, order_id, buyer_id, price_brl } = await req.json();

    // ──────────────────────────────────────────────
    // 1. CHECK AVAILABILITY — before generating PIX
    // ──────────────────────────────────────────────
    if (action === "check_availability") {
      if (!lzt_item_id) {
        return json({ error: "lzt_item_id required" }, 400);
      }

      const res = await fetch(`${LZT_API}/${lzt_item_id}`, {
        headers: { Authorization: `Bearer ${lztApiKey}` },
      });

      if (res.status === 404 || res.status === 410) {
        return json({ available: false, reason: "Conta não encontrada no LZT Market." });
      }

      if (!res.ok) {
        const text = await res.text();
        console.error("LZT check error:", text);
        return json({ available: false, reason: "Erro ao verificar conta no LZT." });
      }

      const data = await res.json();
      const item = data.item;

      if (!item) {
        return json({ available: false, reason: "Conta não encontrada." });
      }

      if (item.sold || item.is_sold || item.status === "sold") {
        return json({ available: false, reason: "Esta conta já foi vendida no LZT Market." });
      }

      if (item.status === "closed" || item.status === "banned" || item.cancel_reason) {
        return json({ available: false, reason: "Esta conta foi fechada ou banida no LZT." });
      }

      // Check if price changed
      const currentPrice = item.price || 0;
      return json({
        available: true,
        currentPriceUsd: currentPrice,
        title: item.title,
      });
    }

    // ──────────────────────────────────────────────
    // 2. FAST BUY — after payment confirmed
    // ──────────────────────────────────────────────
    if (action === "fast_buy") {
      if (!lzt_item_id || !account_id || !order_id || !buyer_id) {
        return json({ error: "Missing required fields" }, 400);
      }

      // Double-check availability before buying
      const checkRes = await fetch(`${LZT_API}/${lzt_item_id}`, {
        headers: { Authorization: `Bearer ${lztApiKey}` },
      });

      if (!checkRes.ok) {
        const text = await checkRes.text();
        console.error("LZT pre-buy check failed:", text);
        return json({ error: "Erro ao verificar conta antes da compra.", needsRefund: true });
      }

      const checkData = await checkRes.json();
      const checkItem = checkData.item;

      if (!checkItem || checkItem.sold || checkItem.is_sold || checkItem.status === "sold") {
        // Account was sold between PIX generation and payment — needs refund
        await supabase.from("orders").update({ status: "refund_needed" }).eq("id", order_id);
        return json({
          error: "Conta vendida no LZT antes do pagamento ser confirmado. Reembolso necessário.",
          needsRefund: true,
        });
      }

      // Execute fast_buy on LZT
      const buyRes = await fetch(`${LZT_API}/${lzt_item_id}/fast-buy`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lztApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ price: checkItem.price }),
      });

      if (!buyRes.ok) {
        const errText = await buyRes.text();
        console.error("LZT fast_buy error:", errText);

        // Try to parse for specific errors
        try {
          const errData = JSON.parse(errText);
          if (errData.errors?.includes("not_enough_money")) {
            return json({ error: "Saldo insuficiente na conta LZT para comprar esta conta.", needsRefund: true });
          }
        } catch (_) {}

        await supabase.from("orders").update({ status: "refund_needed" }).eq("id", order_id);
        return json({ error: "Erro ao comprar conta no LZT Market.", needsRefund: true });
      }

      const buyData = await buyRes.json();
      console.log("LZT fast_buy success:", JSON.stringify(buyData));

      // Extract credentials using robust multi-source extraction
      const credential = extractPurchaseCredentials(buyData);

      // Update our DB: mark account as sold
      await supabase
        .from("lzt_accounts")
        .update({
          status: "sold",
          buyer_id: buyer_id,
          sold_at: new Date().toISOString(),
          sold_price: price_brl,
        })
        .eq("id", account_id);

      // Update order as delivered
      await supabase
        .from("orders")
        .update({ status: "delivered" })
        .eq("id", order_id);

      // Log delivery
      await supabase.from("delivery_logs").insert({
        order_id: order_id,
        buyer_id: buyer_id,
        credential_delivered: credential,
      });

      // Send Discord webhook notification
      try {
        const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_SALES");
        if (webhookUrl) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, email")
            .eq("user_id", buyer_id)
            .single();

          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              embeds: [{
                title: "💰 Nova Venda LZT",
                color: 0xFFD700,
                fields: [
                  { name: "Conta", value: `#${lzt_item_id}`, inline: true },
                  { name: "Valor", value: `R$ ${Number(price_brl).toFixed(2)}`, inline: true },
                  { name: "Comprador", value: profile?.display_name || profile?.email || "Desconhecido", inline: true },
                ],
                timestamp: new Date().toISOString(),
                footer: { text: "VBUCKS BARATO" },
              }],
            }),
          });
        }
      } catch (e) {
        console.error("Discord webhook error (non-fatal):", e);
      }

      return json({ success: true, credential });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error("LZT purchase error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
