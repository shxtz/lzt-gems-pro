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
    console.error(`${errorPrefix}:`, errorText);
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
    // ── Auth ─────────────────────────────────────────────
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

    // ── Input: ONLY orderId ──────────────────────────────
    const { orderId } = await req.json();

    if (!orderId) {
      return json({ error: "orderId é obrigatório" }, 400);
    }

    // ── Fetch order from DB ──────────────────────────────
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("id, total_price, status, user_id, payment_id")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return json({ error: "Pedido não encontrado" }, 404);
    }

    // ── Ownership check ──────────────────────────────────
    if (order.user_id !== user.id) {
      return json({ error: "Acesso negado" }, 403);
    }

    // ── Status check ─────────────────────────────────────
    if (order.status !== "pending") {
      return json({ error: "Pedido já processado" }, 400);
    }

    // ── Prevent duplicate PIX ────────────────────────────
    if (order.payment_id) {
      return json({ error: "Pagamento já gerado para este pedido" }, 400);
    }

    // ── Generate PIX ─────────────────────────────────────
    const amount = Number(order.total_price);

    if (!Number.isFinite(amount) || amount <= 0) {
      return json({ error: "Valor do pedido inválido" }, 400);
    }

    const efi = getEfiClient();
    httpClient = efi.httpClient;
    const efiToken = await getEfiToken(httpClient, efi.clientId, efi.clientSecret);

    const charge = await fetchJson(
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

    // ── Get QR Code ──────────────────────────────────────
    const qrData = await fetchJson(
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

    // ── Save payment_id on order ─────────────────────────
    await supabase
      .from("orders")
      .update({ payment_id: charge.txid })
      .eq("id", orderId)
      .eq("status", "pending");

    return json({
      txid: charge.txid,
      qrcode: qrData?.imagemQrcode || "",
      copiaecola: qrData?.qrcode || "",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("efi-payment error:", message);
    return json({ error: "Erro ao gerar cobrança PIX" }, 500);
  } finally {
    httpClient?.close();
  }
});
