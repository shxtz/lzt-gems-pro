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

// ──────────────────────────────────────────────
// Robust credential extraction (mirrors Python bot logic)
// ──────────────────────────────────────────────

const EMAIL_PROVIDERS: Record<string, string> = {
  "gmail.com": "Google (Gmail)", "googlemail.com": "Google (Gmail)",
  "outlook.com": "Microsoft (Outlook)", "hotmail.com": "Microsoft (Hotmail)",
  "live.com": "Microsoft (Live)", "msn.com": "Microsoft (MSN)",
  "yahoo.com": "Yahoo Mail", "yahoo.com.br": "Yahoo Mail",
  "icloud.com": "Apple (iCloud)", "me.com": "Apple (iCloud)", "mac.com": "Apple (iCloud)",
  "protonmail.com": "ProtonMail", "proton.me": "ProtonMail",
  "uol.com.br": "UOL", "bol.com.br": "BOL", "terra.com.br": "Terra",
  "ig.com.br": "iG", "globo.com": "Globo", "zoho.com": "Zoho Mail",
  "rambler.ru": "Rambler", "mail.ru": "Mail.ru",
  "yandex.ru": "Yandex", "yandex.com": "Yandex",
  "firstmail.ltd": "FirstMail", "bonjourfmail.com": "BonjourFMail",
};

function getVal(obj: any, ...keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj?.[k];
    if (v && typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function detectProvider(email?: string, providerRaw?: string): string {
  // If we got a URL like https://outlook.com, extract domain
  if (providerRaw) {
    try {
      const url = new URL(providerRaw);
      const host = url.hostname.replace(/^www\./, "");
      return EMAIL_PROVIDERS[host] || host;
    } catch {
      // Not a URL, use as-is or look up
      const lower = providerRaw.toLowerCase();
      for (const [domain, name] of Object.entries(EMAIL_PROVIDERS)) {
        if (lower === domain || lower === name.toLowerCase() || domain.startsWith(lower + ".")) {
          return name;
        }
      }
      return providerRaw;
    }
  }
  if (email) {
    const domain = email.split("@")[1]?.toLowerCase() || "";
    return EMAIL_PROVIDERS[domain] || domain || "Desconhecido";
  }
  return "";
}

function extractPurchaseCredentials(buyData: any): string {
  // Collect candidate objects to search
  const candidates: any[] = [];
  const root = buyData || {};
  for (const key of ["item", "account", "data", "payload", "result"]) {
    if (root[key] && typeof root[key] === "object") {
      candidates.push(root[key]);
      // Nested sub-objects
      for (const subKey of ["item", "account", "data", "payload", "result"]) {
        if (root[key][subKey] && typeof root[key][subKey] === "object") {
          candidates.push(root[key][subKey]);
        }
      }
    }
  }
  candidates.push(root);

  // Login data structures
  const loginStructs: any[] = [];
  const emailStructs: any[] = [];
  for (const c of candidates) {
    for (const k of ["loginData", "login_data", "credentials"]) {
      if (c[k] && typeof c[k] === "object") loginStructs.push(c[k]);
    }
    for (const k of ["emailLoginData", "email_login_data", "emailData"]) {
      if (c[k] && typeof c[k] === "object") emailStructs.push(c[k]);
    }
  }

  // 1. Extract login
  let login: string | undefined;
  for (const s of loginStructs) {
    login = getVal(s, "login", "username", "user", "email");
    if (login) break;
  }
  if (!login) {
    for (const c of candidates) {
      login = getVal(c, "login", "username", "account_login", "user_login");
      if (login) break;
    }
  }

  // 2. Extract password
  let password: string | undefined;
  for (const s of loginStructs) {
    password = getVal(s, "password", "pass", "passwd");
    if (password) break;
  }
  if (!password) {
    for (const c of candidates) {
      password = getVal(c, "password", "pass", "account_password");
      if (password) break;
    }
  }

  // 3. Extract old password
  let oldPassword: string | undefined;
  for (const s of loginStructs) {
    oldPassword = getVal(s, "old_password", "oldPassword", "previous_password");
    if (oldPassword) break;
  }
  if (!oldPassword) {
    for (const c of candidates) {
      oldPassword = getVal(c, "old_password", "oldPassword", "previous_password");
      if (oldPassword) break;
    }
  }

  // 4. Extract email
  let email: string | undefined;
  for (const s of emailStructs) {
    email = getVal(s, "login", "email", "username");
    if (email) break;
  }
  if (!email) {
    for (const c of candidates) {
      email = getVal(c, "temp_email", "email", "email_login", "mail");
      if (email) break;
    }
  }
  // If no separate email but login looks like email, use it
  if (!email && login && login.includes("@")) {
    email = login;
  }

  // 5. Extract email password
  let emailPass: string | undefined;
  for (const s of emailStructs) {
    emailPass = getVal(s, "password", "pass", "passwd");
    if (emailPass) break;
  }
  if (!emailPass) {
    for (const c of candidates) {
      emailPass = getVal(c, "email_password", "mail_password", "temp_email_password");
      if (emailPass) break;
    }
  }

  // 6. Extract provider
  let providerRaw: string | undefined;
  for (const c of candidates) {
    providerRaw = getVal(c, "emailLoginUrl", "email_login_url", "email_provider", "item_domain", "provider");
    if (providerRaw) break;
  }

  // 7. Fallback: free text extraction
  if (!login || !password) {
    let freeText = "";
    for (const c of candidates) {
      for (const k of ["delivery", "deliveryData", "delivery_data", "message", "description", "text"]) {
        const v = c[k];
        if (v && typeof v === "string") freeText += "\n" + v;
        else if (v && typeof v === "object") freeText += "\n" + JSON.stringify(v);
      }
    }
    if (freeText) {
      if (!login) {
        const m = freeText.match(/(?:login|username)\s*[:=]\s*(\S+)/i);
        if (m) login = m[1];
      }
      if (!password) {
        const m = freeText.match(/(?:senha|password|pass)\s*[:=]\s*(\S+)/i);
        if (m) password = m[1];
      }
      if (!email) {
        const m = freeText.match(/(?:email|e-mail)\s*[:=]\s*(\S+@\S+)/i);
        if (m) email = m[1];
      }
      if (!emailPass) {
        const m = freeText.match(/(?:senha\s*(?:do\s*)?e?-?mail|email\s*password|mail\s*password)\s*[:=]\s*(\S+)/i);
        if (m) emailPass = m[1];
      }
      if (!providerRaw) {
        const m = freeText.match(/(https?:\/\/[^\s]+)/i);
        if (m) providerRaw = m[1];
      }
    }
  }

  // Build credential string
  const provider = detectProvider(email, providerRaw);
  const parts: string[] = [];
  if (login) parts.push(`Login: ${login}`);
  if (password) parts.push(`Password: ${password}`);
  if (oldPassword) parts.push(`Old password: ${oldPassword}`);
  if (email) parts.push(`Access to email (auto registered):\nLogin: ${email}`);
  if (emailPass) parts.push(`Password: ${emailPass}`);
  if (provider) parts.push(`Provedor Email: ${provider}`);

  if (parts.length > 0) return parts.join("\n");

  // Ultimate fallback: stringify anything we got
  const raw = buyData?.item?.account;
  if (raw) return typeof raw === "string" ? raw : JSON.stringify(raw, null, 2);

  return "Conta comprada — verifique sua área do cliente";
}
