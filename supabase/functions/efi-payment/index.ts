import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type MtlsRequestInit = RequestInit & { client?: Deno.HttpClient };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const log = (context: string, data: Record<string, unknown>) =>
  console.log(`[efi-payment] ${context}`, JSON.stringify(data));

const logError = (context: string, data: Record<string, unknown>) =>
  console.error(`[efi-payment] ${context}`, JSON.stringify(data));

// ── EFI mTLS helpers ────────────────────────────────────────

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

function getEfiClient() {
  const clientId = Deno.env.get("EFI_CLIENT_ID");
  const clientSecret = Deno.env.get("EFI_CLIENT_SECRET");
  const certBase64 = Deno.env.get("EFI_CERTIFICATE_P12_BASE64");
  const pixKey = Deno.env.get("EFI_PIX_KEY");
  const certificatePassword = Deno.env.get("EFI_CERTIFICATE_PASSWORD") ?? "";

  if (!clientId || !clientSecret || !certBase64 || !pixKey) {
    throw new Error("Credenciais PIX não configuradas.");
  }

  const p12 = getP12Container(certBase64, certificatePassword);
  const certBags =
    p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];
  const shroudedKeyBags =
    p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ] ?? [];
  const keyBags =
    p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ?? [];
  const keyBag = shroudedKeyBags[0] ?? keyBags[0];

  if (!certBags.length || !keyBag?.key) {
    throw new Error("Certificado .p12 inválido.");
  }

  const cert = certBags
    .map((bag: any) => forge.pki.certificateToPem(bag.cert))
    .join("\n");
  const key = forge.pki.privateKeyToPem(keyBag.key);

  const httpClient = Deno.createHttpClient({
    cert,
    key,
    http1: true,
    http2: false,
  });

  return { httpClient, clientId, clientSecret, pixKey };
}

async function fetchJson(
  url: string,
  init: MtlsRequestInit,
  errorPrefix: string,
) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const errorText = await response.text();
    logError("fetch_failed", { url, status: response.status, errorText });
    throw new Error(`${errorPrefix} (${response.status})`);
  }
  return response.json();
}

async function getEfiToken(
  httpClient: Deno.HttpClient,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const auth = btoa(`${clientId}:${clientSecret}`);
  const data = await fetchJson(
    "https://pix.api.efipay.com.br/oauth/token",
    {
      method: "POST",
      client: httpClient,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: "grant_type=client_credentials",
    },
    "Efi token error",
  );

  if (!data?.access_token) {
    throw new Error("Resposta inválida ao autenticar no PIX.");
  }
  return data.access_token;
}

// ── Main handler ────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let httpClient: Deno.HttpClient | null = null;

  try {
    // ── 1. Auth ──────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return json({ error: "Unauthorized" }, 401);
    }

    log("auth", { userId: user.id });

    // ── 2. Input: ONLY orderId ───────────────────────────
    const { orderId } = await req.json();

    if (!orderId || typeof orderId !== "string") {
      return json({ error: "orderId é obrigatório" }, 400);
    }

    // ── 3. Fetch order ───────────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total_price, status, user_id, payment_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      logError("order_not_found", { orderId });
      return json({ error: "Pedido não encontrado" }, 404);
    }

    // ── 4. Ownership ─────────────────────────────────────
    if (order.user_id !== user.id) {
      logError("ownership_denied", { orderId, orderUserId: order.user_id, requestUserId: user.id });
      return json({ error: "Acesso negado" }, 403);
    }

    // ── 5. Status check ──────────────────────────────────
    if (order.status !== "pending") {
      log("order_not_pending", { orderId, status: order.status });
      return json({ error: "Pedido já processado" }, 400);
    }

    // ── 6. Duplicate PIX prevention ──────────────────────
    if (order.payment_id) {
      log("payment_already_exists", { orderId, paymentId: order.payment_id });
      return json({ error: "Pagamento já gerado para este pedido" }, 400);
    }

    // ── 7. Validate amount ───────────────────────────────
    const amount = Number(order.total_price);
    if (!Number.isFinite(amount) || amount <= 0) {
      logError("invalid_amount", { orderId, total_price: order.total_price });
      return json({ error: "Valor do pedido inválido" }, 400);
    }

    log("generating_pix", { orderId, amount });

    // ── 8. Atomic lock: claim payment_id slot ────────────
    // Set a temporary placeholder to prevent race conditions.
    // Only succeeds if payment_id is still NULL.
    const placeholderId = `pending_${Date.now()}`;
    const { data: claimed, error: claimError } = await supabase
      .from("orders")
      .update({ payment_id: placeholderId })
      .eq("id", orderId)
      .eq("status", "pending")
      .is("payment_id", null)
      .select("id");

    if (claimError || !claimed || claimed.length !== 1) {
      logError("claim_race_lost", { orderId, claimError });
      return json({ error: "Pagamento já está sendo gerado para este pedido" }, 409);
    }

    log("payment_slot_claimed", { orderId, placeholderId });

    // ── 9. Generate PIX ──────────────────────────────────
    let charge: any;
    let qrData: any;

    try {
      const efi = getEfiClient();
      httpClient = efi.httpClient;
      const efiToken = await getEfiToken(httpClient, efi.clientId, efi.clientSecret);

      charge = await fetchJson(
        "https://pix.api.efipay.com.br/v2/cob",
        {
          method: "POST",
          client: httpClient,
          headers: {
            Authorization: `Bearer ${efiToken}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            calendario: { expiracao: 1800 },
            valor: { original: amount.toFixed(2) },
            chave: efi.pixKey,
            solicitacaoPagador: `Pedido ${orderId}`,
            infoAdicionais: [{ nome: "Pedido", valor: String(orderId) }],
          }),
        },
        "Efi charge error",
      );

      if (!charge?.loc?.id || !charge?.txid) {
        throw new Error("Resposta inválida da cobrança PIX.");
      }

      log("pix_charge_created", { orderId, txid: charge.txid });

      qrData = await fetchJson(
        `https://pix.api.efipay.com.br/v2/loc/${charge.loc.id}/qrcode`,
        {
          method: "GET",
          client: httpClient,
          headers: {
            Authorization: `Bearer ${efiToken}`,
            Accept: "application/json",
          },
        },
        "Efi QR code error",
      );

      log("qr_code_generated", { orderId });
    } catch (pixError: unknown) {
      // PIX generation failed — rollback the placeholder
      const errMsg = pixError instanceof Error ? pixError.message : "unknown";
      logError("pix_generation_failed", { orderId, error: errMsg });

      await supabase
        .from("orders")
        .update({ payment_id: null })
        .eq("id", orderId)
        .eq("payment_id", placeholderId);

      log("placeholder_rolled_back", { orderId });
      return json({ error: "Erro ao gerar cobrança PIX" }, 500);
    }

    // ── 10. Save real payment_id ─────────────────────────
    const { data: updated, error: updateError } = await supabase
      .from("orders")
      .update({ payment_id: charge.txid })
      .eq("id", orderId)
      .eq("payment_id", placeholderId)
      .select("id");

    if (updateError || !updated || updated.length !== 1) {
      logError("payment_id_update_failed", { orderId, updateError });
      return json({ error: "Erro ao salvar pagamento" }, 500);
    }

    log("payment_id_saved", { orderId, txid: charge.txid });

    return json({
      txid: charge.txid,
      qrcode: qrData?.imagemQrcode || "",
      copiaecola: qrData?.qrcode || "",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    logError("unhandled", { error: message });
    return json({ error: "Erro ao gerar cobrança PIX" }, 500);
  } finally {
    httpClient?.close();
  }
});
