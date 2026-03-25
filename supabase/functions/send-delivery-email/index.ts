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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { orderId, credential, buyerEmail } = await req.json();

    if (!orderId || !buyerEmail) {
      return new Response(JSON.stringify({ error: "orderId and buyerEmail required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // For now, log the delivery email intent.
    // In production, integrate with an email service (Resend, SendGrid, etc.)
    console.log(`[DELIVERY EMAIL] Order: ${orderId}, To: ${buyerEmail}`);
    console.log(`[DELIVERY EMAIL] Credential preview: ${credential?.substring(0, 20)}...`);

    // Store email log
    // This can be extended with actual email sending once email infra is configured

    return new Response(
      JSON.stringify({
        success: true,
        message: "Delivery email queued",
        note: "Configure email service for actual sending",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Send delivery email error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
