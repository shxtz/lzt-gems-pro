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

    let embeds: any[];

    if (test) {
      embeds = [{
        title: "🧪 Teste de Webhook",
        description: "Esta é uma mensagem de teste enviada pelo painel admin.",
        color: 0xFFD700,
        timestamp: new Date().toISOString(),
        footer: { text: `VBUCKS BARATO • Teste • ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}` },
      }];
    } else {
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

      // Get buyer profile
      let buyer: any = null;
      if (order.user_id) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, email, discord_id")
          .eq("user_id", order.user_id)
          .single();
        buyer = profile;
      }

      // Get product info
      let productName = "N/A";
      if (order.lzt_item_id) {
        const { data: lztAccount } = await supabase
          .from("lzt_accounts")
          .select("title, lzt_item_id, category_id, lzt_categories_public(name)")
          .eq("id", order.lzt_account_id)
          .maybeSingle();
        productName = lztAccount
          ? `${(lztAccount as any).lzt_categories_public?.name || "LZT"}-${lztAccount.lzt_item_id}`
          : `LZT-${order.lzt_item_id}`;
      } else if (order.product_id) {
        const { data: product } = await supabase
          .from("products")
          .select("name")
          .eq("id", order.product_id)
          .maybeSingle();
        productName = product?.name || "Produto";
      } else if (order.variation_id) {
        const { data: variation } = await supabase
          .from("product_variations")
          .select("name, products(name)")
          .eq("id", order.variation_id)
          .maybeSingle();
        productName = variation
          ? `${(variation as any).products?.name || ""} ${variation.name}`.trim()
          : "Produto";
      }

      const now = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
      const isSale = type !== "delivery";
      const discordMention = buyer?.discord_id ? `<@${buyer.discord_id}>` : "N/A";

      if (isSale) {
        // ═══ SALE EMBED (like reference image) ═══
        const lztLink = order.lzt_item_id
          ? `[Ver no LZT](https://lzt.market/${order.lzt_item_id}/)`
          : null;

        embeds = [{
          title: "💎 VBUCKS BARATO - Pagamentos | Compra aprovada",
          color: 0xFFD700,
          fields: [
            { name: "**ID PEDIDO:**", value: `\`${order.id}\``, inline: false },
            { name: "**PRODUTO:**", value: `${productName}${lztLink ? `\n${lztLink}` : ""}`, inline: false },
            { name: "**COMPRADOR:**", value: `${buyer?.email || "N/A"}\n🆔 ID: \`${order.user_id || "N/A"}\`\n✨ Discord: ${discordMention}`, inline: false },
            { name: "**DATA/HORA:**", value: now, inline: false },
            { name: "**METODO DE PAGAMENTO:**", value: order.payment_method === "balance" ? "Saldo" : "Pix - Efi Pay", inline: false },
            ...(order.payment_method !== "balance" ? [{
              name: "**INFORMAÇÕES ADICIONAIS:**",
              value: [
                `• Protocolo: \`${order.payment_id || "N/A"}\``,
                `• Email: ${buyer?.email || "N/A"}`,
                `• Cliente: ${order.pix_client_name || "N/A"}`,
                `• Doc: ${order.pix_client_doc ? maskDoc(order.pix_client_doc) : "N/A"}`,
                `• Chave Pix: \`${order.pix_key || "N/A"}\``,
                `• Código Banco: ${order.pix_bank_code || "N/A"}`,
                `• E2EID: \`${order.pix_e2eid || "N/A"}\``,
                `• TXID: \`${order.payment_id || "N/A"}\``,
              ].join("\n"),
              inline: false,
            }] : []),
            { name: "**TOTAL PAGO:**", value: `**R$ ${Number(order.total_price).toFixed(2).replace(".", ",")}**`, inline: false },
            { name: "Status", value: "✅ Compra aprovada", inline: true },
            { name: "Entrega", value: order.lzt_item_id ? "Automática (LZT)" : "Automática (credenciais)", inline: true },
          ],
          footer: { text: `VBUCKS BARATO • Pagamento confirmado • ${now}` },
          timestamp: new Date().toISOString(),
        }];
      } else {
        // ═══ DELIVERY EMBED (like reference image) ═══
        let credential = "N/A";
        const { data: log } = await supabase
          .from("delivery_logs")
          .select("credential_delivered")
          .eq("order_id", orderId)
          .order("delivered_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        credential = log?.credential_delivered || "N/A";

        const lztLink = order.lzt_item_id
          ? `[Ver no LZT](https://lzt.market/${order.lzt_item_id}/)`
          : null;

        // Parse credential for display
        const credLines = credential.split("\n").filter(Boolean);
        const credDisplay = credLines.map((line: string) => `• ${line}`).join("\n");

        embeds = [{
          title: "✅ Entrega automática realizada",
          color: 0x00FF00,
          fields: [
            { name: "🏷️ Produto", value: productName, inline: true },
            { name: "💰 Valor Venda", value: `R$ ${Number(order.total_price).toFixed(2).replace(".", ",")}`, inline: true },
            { name: "👤 Cliente", value: `${buyer?.email || "N/A"}\n🆔 ID: \`${order.user_id || "N/A"}\`\n✨ Discord: ${discordMention}`, inline: false },
            ...(lztLink ? [{ name: "🔗 Link", value: lztLink, inline: false }] : []),
            { name: "🔑 ID Pedido", value: `\`${order.id}\``, inline: false },
            { name: "📦 Status", value: "Credenciais entregues com sucesso ao cliente", inline: false },
            { name: "📮 Detalhes entregues", value: `\`\`\`\n${credDisplay.substring(0, 900)}\n\`\`\``, inline: false },
          ],
          footer: { text: `VBUCKS BARATO • Entrega concluída • ${now}` },
          timestamp: new Date().toISOString(),
        }];
      }
    }

    const discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ embeds }),
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
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function maskDoc(doc: string): string {
  if (!doc) return "N/A";
  const clean = doc.replace(/\D/g, "");
  if (clean.length === 11) {
    return `***.${clean.slice(3, 6)}.${clean.slice(6, 9)}-**`;
  }
  if (clean.length === 14) {
    return `${clean.slice(0, 2)}.***.***/****-${clean.slice(12)}`;
  }
  return doc;
}
