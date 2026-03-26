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

  for (const line of lines) {
    const lower = line.toLowerCase();
    const getValue = () => line.substring(line.indexOf(":") + 1).trim();

    if (lower.startsWith("login and password:")) {
      // Skip this combined field, we already have login + password separately
      continue;
    } else if (lower.startsWith("login:")) {
      result.login = getValue();
    } else if (lower.startsWith("password:") || (lower.startsWith("senha:") && !lower.startsWith("senha email:") && !lower.startsWith("senha e-mail:"))) {
      result.password = getValue();
    } else if (lower.startsWith("old password:") || lower.startsWith("senha antiga:")) {
      result.oldPassword = getValue();
    } else if (lower.startsWith("access to email") || lower.startsWith("email:") || lower.startsWith("e-mail:")) {
      // "Access to email (auto registered):" or "Email:"
      const val = getValue();
      // If the value contains sub-lines like login/password for email, skip setting as email
      // But typically it's just a label, the actual email is the login itself
      if (val && val.includes("@")) {
        result.email = val;
      } else if (!val || val === "" || lower.includes("auto registered") || lower.includes("(")) {
        // "Access to email (auto registered):" is just a section header
        // The email is likely the login itself
        if (result.login && result.login.includes("@")) {
          result.email = result.login;
        }
      }
    } else if (lower.startsWith("senha email:") || lower.startsWith("senha e-mail:") || lower.startsWith("email password:") || lower.startsWith("emailpassword:")) {
      result.emailPassword = getValue();
    } else if (lower.startsWith("provedor email:") || lower.startsWith("provedor do email:") || lower.startsWith("provedor:")) {
      // Already parsed, skip
    } else if (!result.login && !result.raw) {
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

  // Detect provider from email
  if (result.email) {
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