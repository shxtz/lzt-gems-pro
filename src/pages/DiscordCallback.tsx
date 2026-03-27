import { useEffect } from "react";

const DiscordCallback = () => {
  useEffect(() => {
    // RestoreCord redirects here after successful verification.
    // It does NOT pass any query params — landing on this page IS the proof.
    // The actual discord_id will be resolved later via retry-discord-lookup.

    const payload = {
      type: "RESTORECORD_VERIFIED",
      verified: true,
      discord_id: null,
      username: "Discord verificado",
      avatar: null,
    };

    try {
      localStorage.setItem("restorecord_verified", JSON.stringify(payload));
    } catch {}

    if (window.opener) {
      try { window.opener.postMessage(payload, "*"); } catch {}
      setTimeout(() => window.close(), 600);
    } else {
      setTimeout(() => {
        window.location.href = "/auth?restorecord_verified=1";
      }, 300);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground text-sm animate-pulse">
        ✅ Verificado! Redirecionando...
      </p>
    </div>
  );
};

export default DiscordCallback;
