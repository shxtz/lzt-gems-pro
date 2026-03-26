import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const DiscordCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  useEffect(() => {
    const discordId = searchParams.get("discord_id");
    const username = searchParams.get("username");
    const avatar = searchParams.get("avatar");

    if (!discordId) {
      setStatus("error");
      setTimeout(() => window.close(), 2000);
      return;
    }

    const payload = {
      type: "RESTORECORD_VERIFIED",
      discord_id: discordId,
      username: username || "Discord User",
      avatar: avatar || null,
    };

    // Also persist to localStorage so the parent can pick it up even if postMessage fails
    try {
      localStorage.setItem("restorecord_verified", JSON.stringify(payload));
    } catch {}

    if (window.opener) {
      // Try posting to both possible origins
      try { window.opener.postMessage(payload, "*"); } catch {}
      setStatus("success");
      // Small delay so parent can process the message
      setTimeout(() => window.close(), 600);
    } else {
      // No opener – redirect to /auth with params
      setStatus("success");
      setTimeout(() => {
        window.location.href = `/auth?discord_id=${discordId}&username=${encodeURIComponent(username || "")}&avatar=${encodeURIComponent(avatar || "")}`;
      }, 300);
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground text-sm animate-pulse">
        {status === "verifying" && "Verificando Discord..."}
        {status === "success" && "✅ Verificado! Fechando..."}
        {status === "error" && "❌ Erro na verificação"}
      </p>
    </div>
  );
};

export default DiscordCallback;
