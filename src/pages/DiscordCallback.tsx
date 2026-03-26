import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const DiscordCallback = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const discordId = searchParams.get("discord_id");
    const username = searchParams.get("username");
    const avatar = searchParams.get("avatar");

    if (discordId && window.opener) {
      window.opener.postMessage(
        {
          type: "RESTORECORD_VERIFIED",
          discord_id: discordId,
          username: username || "Discord User",
          avatar: avatar || null,
        },
        window.location.origin
      );
      window.close();
    } else if (discordId) {
      // Fallback: no opener (e.g. same tab redirect) → go to /auth with params
      window.location.href = `/auth?discord_id=${discordId}&username=${encodeURIComponent(username || "")}&avatar=${encodeURIComponent(avatar || "")}`;
    } else {
      // No data received
      window.close();
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground text-sm animate-pulse">Verificando Discord...</p>
    </div>
  );
};

export default DiscordCallback;
