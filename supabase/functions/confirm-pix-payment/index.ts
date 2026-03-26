import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type MtlsRequestInit = RequestInit & { client?: Deno.HttpClient };

type EfiConfig = {
  client: Deno.HttpClient;
  clientId: string;
  clientSecret: string;
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function getP12Container(certBase64: string, password: string) {
  const cleanedBase64 = certBase64.replace(/\s/g, "");
  const der = forge.util.decode64(cleanedBase64);
  const asn1 = forge.asn1.fromDer(der);

  try {
    return forge.pkcs12.pkcs12FromAsn1(asn1, password);
  } catch {
    return forge.pkcs12.pkcs12FromAsn1(asn1, false, password);
  }
}

function getEfiConfig(): EfiConfig {
  const clientId = Deno.env.get("EFI_CLIENT_ID");
  const clientSecret = Deno.env.get("EFI_CLIENT_SECRET");
  const certBase64 = Deno.env.get("EFI_CERTIFICATE_P12_BASE64");
  const certificatePassword = Deno.env.get("EFI_CERTIFICATE_PASSWORD") ?? "";

  if (!clientId || !clientSecret || !certBase64) {
    throw new Error("Credenciais PIX não configuradas corretamente.");
  }

  const p12 = getP12Container(certBase64, certificatePassword);
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
  const shroudedKeyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [];
  const keyBags = p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? [];
  const keyBag = shroudedKeyBags[0] ?? keyBags[0];

  if (!certBags.length || !keyBag?.key) {
    throw new Error("Não foi possível ler o certificado .p12 da EFI.");
  }

  const cert = certBags.map((bag: any) => forge.pki.certificateToPem(bag.cert)).join("\n");
  const key = forge.pki.privateKeyToPem(keyBag.key);

  const client = Deno.createHttpClient({
    cert,
    key,
    http1: true,
    http2: false,
  });

  return { client, clientId, clientSecret };
}

async function fetchJson(url: string, init: MtlsRequestInit, errorPrefix: string) {
  const response = await fetch(url, init);
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok) {
    console.error(`${errorPrefix}:`, payload);
    throw new Error(`${errorPrefix} (${response.status})`);
  }

  return payload;
}

async function getEfiToken(config: EfiConfig): Promise<string> {
  const auth = btoa(`${config.clientId}:${config.clientSecret}`);
  const data = await fetchJson(
    "https://pix.api.efipay.com.br/oauth/token",
    {
      method: "POST",
      client: config.client,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
    },
    "Efi token error",
  );

  if (!data?.access_token) throw new Error("Resposta inválida ao autenticar no PIX.");
  return data.access_token;
}

async function getDeliveredCredential(supabaseAdmin: ReturnType<typeof createClient>, orderId: string) {
  const { data: log } = await supabaseAdmin
    .from("delivery_logs")
    .select("credential_delivered")
    .eq("order_id", orderId)
    .maybeSingle();

  return log?.credential_delivered ?? null;
}

async function autoRefundToBalance(supabaseAdmin: ReturnType<typeof createClient>, orderId: string, userId: string, amount: number) {
  try {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("balance")
      .eq("user_id", userId)
      .single();

    const newBalance = Number(profile?.balance || 0) + amount;
    await supabaseAdmin
      .from("profiles")
      .update({ balance: newBalance })
      .eq("user_id", userId);

    await supabaseAdmin.from("balance_transactions").insert({
      user_id: userId,
      amount: amount,
      type: "refund",
      description: `Reembolso automático - pedido #${orderId.slice(0, 8)}`,
    });

    await supabaseAdmin
      .from("orders")
      .update({ status: "refunded", updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .neq("status", "delivered");

    console.log(`Auto-refunded R$${amount.toFixed(2)} to balance for order ${orderId}`);
    return newBalance;
  } catch (e) {
    console.error("Auto-refund failed:", e);
    // Fallback: just mark as refund_needed
    await supabaseAdmin
      .from("orders")
      .update({ status: "refund_needed", updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .neq("status", "delivered");
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let client: Deno.HttpClient | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Não autorizado" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    if (!anonKey) throw new Error("Chave pública não configurada.");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !userData.user) {
      return jsonResponse({ error: "Sessão inválida" }, 401);
    }

    const { orderId, txid } = await req.json();
    if (!orderId || !txid) {
      return jsonResponse({ error: "orderId e txid são obrigatórios" }, 400);
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, status, payment_id, total_price, product_id, lzt_item_id, lzt_account_id, lzt_reserved_credentials, pix_e2eid")
      .eq("id", orderId)
      .eq("payment_id", txid)
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (orderError) throw orderError;
    if (!order) return jsonResponse({ error: "Pedido não encontrado" }, 404);

    if (order.status === "delivered") {
      return jsonResponse({
        paid: true,
        delivered: true,
        status: "delivered",
        credential: await getDeliveredCredential(supabaseAdmin, order.id),
      });
    }

    if (order.status === "refund_needed" || order.status === "cancelled") {
      return jsonResponse({ paid: true, delivered: false, status: order.status });
    }

    const efiConfig = getEfiConfig();
    client = efiConfig.client;
    const token = await getEfiToken(efiConfig);
    const payment = await fetchJson(
      `https://pix.api.efipay.com.br/v2/cob/${encodeURIComponent(txid)}`,
      {
        method: "GET",
        client,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
      "Efi payment status error",
    );

    const paid = payment?.status === "CONCLUIDA" || (Array.isArray(payment?.pix) && payment.pix.length > 0);
    if (!paid) {
      return jsonResponse({ paid: false, delivered: false, status: payment?.status ?? order.status });
    }

    const { data: claimedOrder } = await supabaseAdmin
      .from("orders")
      .update({ status: "paid", updated_at: new Date().toISOString() })
      .eq("id", order.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();

    if (!claimedOrder) {
      const { data: refreshedOrder } = await supabaseAdmin
        .from("orders")
        .select("status")
        .eq("id", order.id)
        .single();

      if (refreshedOrder?.status === "delivered") {
        return jsonResponse({
          paid: true,
          delivered: true,
          status: "delivered",
          credential: await getDeliveredCredential(supabaseAdmin, order.id),
        });
      }

      return jsonResponse({ paid: true, delivered: false, status: refreshedOrder?.status ?? "paid" });
    }

    if (order.lzt_item_id && order.lzt_account_id) {
      // Check for pre-reserved credentials
      const reservedCreds = (order as any).lzt_reserved_credentials;
      const hasReserved = reservedCreds && (reservedCreds.login || reservedCreds.email || reservedCreds.password);

      const lztPayload: Record<string, any> = {
        action: "fast_buy",
        lzt_item_id: order.lzt_item_id,
        account_id: order.lzt_account_id,
        order_id: order.id,
        buyer_id: userData.user.id,
        price_brl: order.total_price,
      };

      if (hasReserved) {
        lztPayload.use_reserved = true;
        lztPayload.reserved_credentials = reservedCreds;
        console.log(`Using pre-reserved LZT credentials for order ${order.id}`);
      }

      // Retry up to 2 times on 5xx errors
      let lastResult = { ok: false, status: 0, bodyText: "" };
      for (let attempt = 0; attempt <= 2; attempt++) {
        if (attempt > 0) {
          console.log(`LZT retry attempt ${attempt}/2...`);
          await new Promise((r) => setTimeout(r, 1500 * attempt));
        }

        const lztResponse = await fetch(`${supabaseUrl}/functions/v1/lzt-purchase`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceRoleKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(lztPayload),
        });

        const lztBodyText = await lztResponse.text();
        lastResult = { ok: lztResponse.ok, status: lztResponse.status, bodyText: lztBodyText };

        if (lztResponse.ok) break;
        if (lztResponse.status < 500 || lztResponse.status >= 600) break; // non-retryable
      }

      try {
        const lztData = JSON.parse(lastResult.bodyText);
        if (lztData?.success) {
          return jsonResponse({
            paid: true,
            delivered: true,
            status: "delivered",
            credential: lztData.credential,
          });
        }

        // Before marking refund, check if actually delivered (race condition safety)
        const { data: postOrder } = await supabaseAdmin
          .from("orders")
          .select("status")
          .eq("id", order.id)
          .single();

        if (postOrder?.status === "delivered") {
          return jsonResponse({
            paid: true,
            delivered: true,
            status: "delivered",
            credential: await getDeliveredCredential(supabaseAdmin, order.id),
          });
        }

        await autoRefundToBalance(supabaseAdmin, order.id, order.user_id, Number(order.total_price));

        return jsonResponse({
          paid: true,
          delivered: false,
          status: "refunded",
          error: lztData?.error ?? "Erro ao comprar conta. Valor reembolsado em saldo.",
        });
      } catch (parseError) {
        console.error("LZT response parse error:", parseError, lastResult.bodyText);
        await autoRefundToBalance(supabaseAdmin, order.id, order.user_id, Number(order.total_price));

        return jsonResponse({
          paid: true,
          delivered: false,
          status: "refunded",
          error: "Erro ao finalizar a compra. Valor reembolsado em saldo.",
        });
      }
    }

    if (order.product_id) {
      const deliverResponse = await fetch(`${supabaseUrl}/functions/v1/deliver-product`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          variationId: order.product_id,
          buyerId: userData.user.id,
          orderId: order.id,
        }),
      });

      const deliverData = await deliverResponse.json();
      if (!deliverResponse.ok || deliverData?.error) {
        throw new Error(deliverData?.error || "Erro ao entregar produto");
      }

      await supabaseAdmin
        .from("orders")
        .update({ status: "delivered", updated_at: new Date().toISOString() })
        .eq("id", order.id);

      return jsonResponse({
        paid: true,
        delivered: true,
        status: "delivered",
        credential: deliverData?.credential ?? null,
      });
    }

    return jsonResponse({ paid: true, delivered: false, status: "paid" });
  } catch (error: any) {
    console.error("Confirm PIX payment error:", error);
    return jsonResponse({ error: error.message || "Internal error" }, 500);
  } finally {
    client?.close();
  }
});