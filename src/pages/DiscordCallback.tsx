import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

const DiscordCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const getParam = (key: string) => searchParams.get(key) ?? hashParams.get(key);

    const discordId = getParam("discord_id");
    const username = getParam("username");
    const avatar = getParam("avatar");
    const verifiedFlag = getParam("restorecord_verified") ?? getParam("verified") ?? getParam("success");
    const hasVerification = Boolean(
      discordId ||
      verifiedFlag === "1" ||
      verifiedFlag === "true" ||
      document.referrer.includes("restorecord.com") ||
      document.referrer.includes("discord.com"),
    );

    if (!hasVerification) {
      setStatus("error");
      setTimeout(() => window.close(), 2000);
      return;
    }

    const payload = {
      type: "RESTORECORD_VERIFIED",
      verified: true,
      discord_id: discordId || null,
      username: username || "Discord verificado",
      avatar: avatar || null,
    };

    // Also persist to localStorage so the parent can pick it up even if postMessage fails
    try {
      localStorage.setItem("restorecord_verified", JSON.stringify(payload));
    } catch {}

    if (window.opener) {
      try { window.opener.postMessage(payload, "*"); } catch {}
      setStatus("success");
      setTimeout(() => window.close(), 600);
    } else {
      setStatus("success");
      setTimeout(() => {
        const redirectParams = new URLSearchParams({
          restorecord_verified: "1",
          username: username || "Discord verificado",
        });

        if (discordId) redirectParams.set("discord_id", discordId);
        if (avatar) redirectParams.set("avatar", avatar);

        window.location.href = `/auth?${redirectParams.toString()}`;
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
