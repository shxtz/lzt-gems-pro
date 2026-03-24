import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function getEfiToken(): Promise<string> {
  const clientId = Deno.env.get("EFI_CLIENT_ID")!;
  const clientSecret = Deno.env.get("EFI_CLIENT_SECRET")!;
  const certBase64 = Deno.env.get("EFI_CERTIFICATE_P12_BASE64")!;

  const auth = btoa(`${clientId}:${clientSecret}`);

  // For production Efi API, we use the OAuth2 token endpoint
  const response = await fetch("https://pix.api.efipay.com.br/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ grant_type: "client_credentials" }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Efi token error:", errorText);
    throw new Error(`Failed to get Efi token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, amount, description } = await req.json();

    if (!orderId || !amount) {
      return new Response(
        JSON.stringify({ error: "orderId and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = await getEfiToken();

    // Create PIX charge
    const chargeResponse = await fetch("https://pix.api.efipay.com.br/v2/cob", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        calendario: { expiracao: 3600 },
        valor: { original: amount.toFixed(2) },
        chave: Deno.env.get("EFI_PIX_KEY") || "",
        solicitacaoPagador: description || `Pedido ${orderId}`,
        infoAdicionais: [{ nome: "Pedido", valor: orderId }],
      }),
    });

    if (!chargeResponse.ok) {
      const errorText = await chargeResponse.text();
      console.error("Efi charge error:", errorText);
      throw new Error(`Failed to create charge: ${chargeResponse.status}`);
    }

    const charge = await chargeResponse.json();

    // Get QR Code
    const qrResponse = await fetch(
      `https://pix.api.efipay.com.br/v2/loc/${charge.loc.id}/qrcode`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    let qrcode = "";
    let copiaecola = "";

    if (qrResponse.ok) {
      const qrData = await qrResponse.json();
      qrcode = qrData.imagemQrcode || "";
      copiaecola = qrData.qrcode || "";
    }

    return new Response(
      JSON.stringify({
        txid: charge.txid,
        qrcode,
        copiaecola,
        status: charge.status,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("PIX charge error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
