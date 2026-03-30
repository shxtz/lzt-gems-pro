import * as React from 'npm:react@18.3.1'
import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { template as deliveryTemplate } from '../_shared/transactional-email-templates/delivery-confirmation.tsx'

const SITE_NAME = "VBUCKS BARATO"
const FROM_EMAIL = `${SITE_NAME} <noreply@vbucksbarato.com>`

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const resendApiKey = Deno.env.get("RESEND_API_KEY")
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const { orderId, credential, buyerEmail, productName, totalPrice } = await req.json()

    if (!orderId || !buyerEmail) {
      return new Response(JSON.stringify({ error: "orderId and buyerEmail required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured")
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Render the delivery confirmation template
    const html = await renderAsync(
      React.createElement(deliveryTemplate.component, {
        productName: productName || 'Produto',
        credential: credential || '',
        orderId,
        totalPrice: totalPrice || '',
      })
    )

    const subject = typeof deliveryTemplate.subject === 'function'
      ? deliveryTemplate.subject({})
      : deliveryTemplate.subject

    // Send via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [buyerEmail],
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Resend API error', { status: response.status, error: errorText })
      return new Response(JSON.stringify({ error: "Failed to send delivery email" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const data = await response.json()
    console.log(`[DELIVERY EMAIL] Sent via Resend: ${data.id}, To: ${buyerEmail}, Order: ${orderId}`)

    // Log to email_send_log
    await supabase.from('email_send_log').insert({
      message_id: data.id || crypto.randomUUID(),
      template_name: 'delivery-confirmation',
      recipient_email: buyerEmail,
      status: 'sent',
    })

    return new Response(
      JSON.stringify({ success: true, message: "Delivery email sent", resendId: data.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (err) {
    console.error("Send delivery email error:", err)
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})