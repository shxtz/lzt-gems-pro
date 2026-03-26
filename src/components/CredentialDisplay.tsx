import { Copy, Check, User, Lock, Mail, Shield, Globe } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ParsedCredential {
  login?: string;
  password?: string;
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
    // Match "Label: value" patterns
    if (lower.startsWith("login:")) {
      result.login = line.substring(line.indexOf(":") + 1).trim();
    } else if (lower.startsWith("senha:") && !lower.startsWith("senha email:") && !lower.startsWith("senha e-mail:")) {
      result.password = line.substring(line.indexOf(":") + 1).trim();
    } else if (lower.startsWith("email:") || lower.startsWith("e-mail:")) {
      result.email = line.substring(line.indexOf(":") + 1).trim();
    } else if (lower.startsWith("senha email:") || lower.startsWith("senha e-mail:") || lower.startsWith("email password:") || lower.startsWith("emailpassword:")) {
      result.emailPassword = line.substring(line.indexOf(":") + 1).trim();
    } else if (!result.login && !result.raw) {
      // Fallback: try email:password format
      const colonIdx = line.indexOf(":");
      if (colonIdx > 0) {
        result.login = line.substring(0, colonIdx).trim();
        result.password = line.substring(colonIdx + 1).trim();
      } else {
        result.raw = raw;
      }
    }
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