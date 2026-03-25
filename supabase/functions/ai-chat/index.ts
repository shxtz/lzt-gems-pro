import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FAQ_RESPONSES: Record<string, string> = {
  "como comprar": "Para comprar, basta navegar pela loja, escolher o produto desejado, adicionar ao carrinho e realizar o pagamento via PIX. Após a confirmação, as credenciais serão entregues automaticamente!",
  "entrega": "A entrega é automática! Assim que o pagamento PIX for confirmado, você receberá as credenciais da conta diretamente no site e por e-mail. Prazo máximo de 48 horas.",
  "seguro": "Sim! Todas as transações são protegidas. Oferecemos garantia vitalícia em todas as contas. Pedido entregue ou seu dinheiro de volta!",
  "pix": "Aceitamos pagamento via PIX com desconto especial. O QR Code é gerado automaticamente no checkout.",
  "reembolso": "Em caso de problemas com a conta entregue, entre em contato com nosso suporte. Oferecemos reembolso total caso o produto não corresponda ao anunciado.",
  "discord": "A verificação via Discord é obrigatória para garantir sua segurança. Ela permite que você seja reinserido automaticamente em futuros servidores e facilita o suporte.",
  "suporte": "Nosso suporte funciona 24h via chat no site ou pelo Discord. Estamos sempre prontos para ajudar!",
  "vbucks": "Os V-Bucks são enviados diretamente para sua conta Fortnite via pedido de amizade no jogo. Não é necessário informar login ou senha.",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, userId } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "message is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lowerMessage = message.toLowerCase();

    // Try FAQ matching first
    for (const [key, response] of Object.entries(FAQ_RESPONSES)) {
      if (lowerMessage.includes(key)) {
        return new Response(JSON.stringify({ response, source: "faq" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Default response
    const defaultResponse = "Obrigado pela sua mensagem! Um de nossos atendentes irá responder em breve. Enquanto isso, você pode verificar nossa seção de Perguntas Frequentes para respostas rápidas.";

    return new Response(JSON.stringify({ response: defaultResponse, source: "default" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("AI chat error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
