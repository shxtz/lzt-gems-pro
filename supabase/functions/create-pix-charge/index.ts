import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type MtlsRequestInit = RequestInit & { client?: Deno.HttpClient };

type EfiConfig = {
  client: Deno.HttpClient;
  clientId: string;
  clientSecret: string;
  pixKey: string;
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
  const pixKey = Deno.env.get("EFI_PIX_KEY");
  const certificatePassword = Deno.env.get("EFI_CERTIFICATE_PASSWORD") ?? "";

  if (!clientId || !clientSecret || !certBase64 || !pixKey) {
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

  const cert = certBags
    .map((bag: any) => forge.pki.certificateToPem(bag.cert))
    .join("\n");
  const key = forge.pki.privateKeyToPem(keyBag.key);

  const client = Deno.createHttpClient({
    cert,
    key,
    http1: true,
    http2: false,
  });

  return { client, clientId, clientSecret, pixKey };
}

async function fetchJson(url: string, init: MtlsRequestInit, errorPrefix: string) {
  const response = await fetch(url, init);

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${errorPrefix}:`, errorText);
    throw new Error(`${errorPrefix} (${response.status})`);
  }

  return response.json();
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

  if (!data?.access_token) {
    throw new Error("Resposta inválida ao autenticar no PIX.");
  }

  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let client: Deno.HttpClient | null = null;

  try {
    // ═══ AUTHENTICATION ═══
    const authHeader = req.headers.get("Authorization");
    const isServiceRole = authHeader?.includes(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "___NONE___");
    
    if (!isServiceRole) {
      // Validate user JWT
      if (!authHeader?.startsWith("Bearer ")) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !userData.user) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }
    }

    const { orderId, amount, description } = await req.json();
    const numericAmount = Number(amount);

    if (!orderId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      return jsonResponse({ error: "orderId e amount válidos são obrigatórios" }, 400);
    }

    // ═══ VALIDATE AMOUNT AGAINST ORDER ═══
    if (!isServiceRole) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: order } = await supabase
        .from("orders")
        .select("total_price, status")
        .eq("id", orderId)
        .single();
      
      if (!order) {
        return jsonResponse({ error: "Pedido não encontrado" }, 404);
      }
      if (order.status !== "pending") {
        return jsonResponse({ error: "Pedido já processado" }, 400);
      }
      // Validate amount matches order to prevent price manipulation
      const expectedAmount = Number(order.total_price);
      if (Math.abs(numericAmount - expectedAmount) > 0.01) {
        return jsonResponse({ error: "Valor não corresponde ao pedido" }, 400);
      }
    }

    const config = getEfiConfig();
    client = config.client;
    const token = await getEfiToken(config);

    const charge = await fetchJson(
      "https://pix.api.efipay.com.br/v2/cob",
      {
        method: "POST",
        client,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          calendario: { expiracao: 1800 },
          valor: { original: numericAmount.toFixed(2) },
          chave: config.pixKey,
          solicitacaoPagador: description || `Pedido ${orderId}`,
          infoAdicionais: [{ nome: "Pedido", valor: String(orderId) }],
        }),
      },
      "Efi charge error",
    );

    if (!charge?.loc?.id || !charge?.txid) {
      throw new Error("A cobrança PIX foi criada com resposta inválida.");
    }

    const qrData = await fetchJson(
      `https://pix.api.efipay.com.br/v2/loc/${charge.loc.id}/qrcode`,
      {
        method: "GET",
        client,
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
      "Efi QR code error",
    );

    return jsonResponse({
      txid: charge.txid,
      qrcode: qrData?.imagemQrcode || "",
      copiaecola: qrData?.qrcode || "",
      status: charge.status,
    });
  } catch (error: any) {
    console.error("PIX charge error:", error.message);
    return jsonResponse({ error: "Erro ao gerar cobrança PIX" }, 500);
  } finally {
    client?.close();
  }
});
