import { Copy, Check, User, Lock, Mail, Shield, Globe } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ParsedCredential {
  login?: string;
  password?: string;
  oldPassword?: string;
  email?: string;
  emailPassword?: string;
  provider?: string;
  raw?: string;
}

const EMAIL_PROVIDERS: Record<string, string> = {
  "gmail.com": "Google (Gmail)",
  "googlemail.com": "Google (Gmail)",
  "outlook.com": "Microsoft (Outlook)",
  "hotmail.com": "Microsoft (Hotmail)",
  "live.com": "Microsoft (Live)",
  "msn.com": "Microsoft (MSN)",
  "yahoo.com": "Yahoo Mail",
  "yahoo.com.br": "Yahoo Mail",
  "icloud.com": "Apple (iCloud)",
  "me.com": "Apple (iCloud)",
  "mac.com": "Apple (iCloud)",
  "protonmail.com": "ProtonMail",
  "proton.me": "ProtonMail",
  "uol.com.br": "UOL",
  "bol.com.br": "BOL",
  "terra.com.br": "Terra",
  "ig.com.br": "iG",
  "globo.com": "Globo",
  "zoho.com": "Zoho Mail",
  "rambler.ru": "Rambler",
  "mail.ru": "Mail.ru",
  "yandex.ru": "Yandex",
  "yandex.com": "Yandex",
};

function detectProvider(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase() || "";
  return EMAIL_PROVIDERS[domain] || domain || "Desconhecido";
}

export function parseCredential(raw: string): ParsedCredential {
  const lines = raw.trim().split("\n").map((l) => l.trim()).filter(Boolean);
  const result: ParsedCredential = {};

  // Track whether we're in the "email section" after seeing "Access to email"
  let inEmailSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();
    const getValue = () => line.substring(line.indexOf(":") + 1).trim();

    // Skip combined field
    if (lower.startsWith("login and password:")) {
      continue;
    }

    // Detect "Access to email" header — next login/password belong to email
    if (lower.startsWith("access to email")) {
      inEmailSection = true;
      // If it contains an email inline like "Access to email: user@domain.com"
      const val = getValue();
      if (val && val.includes("@")) {
        result.email = val;
      }
      continue;
    }

    // Provider fields
    if (lower.startsWith("provedor email:") || lower.startsWith("provedor do email:") || lower.startsWith("provedor:")) {
      result.provider = getValue();
      continue;
    }

    // Email password explicit fields
    if (lower.startsWith("senha email:") || lower.startsWith("senha e-mail:") || lower.startsWith("email password:") || lower.startsWith("emailpassword:")) {
      result.emailPassword = getValue();
      continue;
    }

    // Old password
    if (lower.startsWith("old password:") || lower.startsWith("senha antiga:")) {
      result.oldPassword = getValue();
      continue;
    }

    // Login field
    if (lower.startsWith("login:")) {
      const val = getValue();
      if (inEmailSection && !result.email) {
        result.email = val;
      } else if (!result.login) {
        result.login = val;
      } else if (!result.email && val.includes("@")) {
        // Second login field with @ is likely email
        result.email = val;
      }
      continue;
    }

    // Password field — context-sensitive
    if (lower.startsWith("password:") || (lower.startsWith("senha:") && !lower.startsWith("senha email:") && !lower.startsWith("senha e-mail:"))) {
      const val = getValue();
      if (inEmailSection && result.email && !result.emailPassword) {
        result.emailPassword = val;
      } else if (!result.password) {
        result.password = val;
      } else if (!result.emailPassword) {
        result.emailPassword = val;
      }
      continue;
    }

    // Email explicit field
    if (lower.startsWith("email:") || lower.startsWith("e-mail:")) {
      const val = getValue();
      if (val && val.includes("@")) {
        result.email = val;
      }
      continue;
    }

    // Fallback: try colon-separated
    if (!result.login && !result.raw) {
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        result.login = line.substring(0, colonIdx).trim();
        result.password = line.substring(colonIdx + 1).trim();
      } else {
        result.raw = raw;
      }
    }
  }

  // If login looks like an email and no email was set, use it
  if (!result.email && result.login && result.login.includes("@")) {
    result.email = result.login;
  }

  // Detect provider from email if not already set
  if (result.email && !result.provider) {
    result.provider = detectProvider(result.email);
  }

  // If nothing was parsed, store raw
  if (!result.login && !result.password && !result.email && !result.raw) {
    result.raw = raw;
  }

  return result;
}

interface CredentialDisplayProps {
  credential: string;
  compact?: boolean;
}

export default function CredentialDisplay({ credential, compact = false }: CredentialDisplayProps) {
  const [copied, setCopied] = useState(false);
  const parsed = parseCredential(credential);

  const handleCopy = () => {
    navigator.clipboard.writeText(credential);
    setCopied(true);
    toast.success("Credencial copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  // If raw/unparsed, show as-is
  if (parsed.raw && !parsed.login && !parsed.email) {
    return (
      <div className="space-y-2">
        <div className="rounded-lg bg-muted/20 border border-border/30 p-3">
          <p className="text-sm text-foreground font-mono break-all select-all whitespace-pre-wrap">{parsed.raw}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 px-2 text-xs">
          {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
          {copied ? "Copiado" : "Copiar tudo"}
        </Button>
      </div>
    );
  }

  const fields = [
    { icon: User, label: "Login", value: parsed.login },
    { icon: Lock, label: "Senha", value: parsed.password },
    { icon: Lock, label: "Senha Antiga", value: parsed.oldPassword },
    { icon: Mail, label: "E-mail", value: parsed.email },
    { icon: Shield, label: "Senha do E-mail", value: parsed.emailPassword },
    { icon: Globe, label: "Provedor do E-mail", value: parsed.provider },
  ].filter((f) => f.value);

  return (
    <div className="space-y-2">
      <div className={`rounded-lg bg-muted/20 border border-border/30 ${compact ? "p-2" : "p-3"} space-y-2`}>
        {fields.map((field, i) => (
          <div key={i} className="flex items-start gap-2">
            <field.icon className={`${compact ? "h-3 w-3 mt-0.5" : "h-3.5 w-3.5 mt-0.5"} text-primary shrink-0`} />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">{field.label}</p>
              <p className={`${compact ? "text-xs" : "text-sm"} text-foreground font-mono break-all select-all`}>{field.value}</p>
            </div>
          </div>
        ))}
      </div>
      <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 px-2 text-xs">
        {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
        {copied ? "Copiado" : "Copiar tudo"}
      </Button>
    </div>
  );
}