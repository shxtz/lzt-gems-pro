import { Globe, Calendar, Shield, Coins, Phone, Mail, Star, Trophy, Swords, UserCheck, BarChart3 } from "lucide-react";

interface AccountDetailsProps {
  lztData: any;
  categoryName?: string;
}

const COMP_TIER_UUID = "03621f52-342b-cf4e-4f86-9350a49c6d04";

const VALORANT_RANK_NAMES: Record<number, string> = {
  0: "Unranked", 3: "Iron 1", 4: "Iron 2", 5: "Iron 3",
  6: "Bronze 1", 7: "Bronze 2", 8: "Bronze 3",
  9: "Silver 1", 10: "Silver 2", 11: "Silver 3",
  12: "Gold 1", 13: "Gold 2", 14: "Gold 3",
  15: "Platinum 1", 16: "Platinum 2", 17: "Platinum 3",
  18: "Diamond 1", 19: "Diamond 2", 20: "Diamond 3",
  21: "Ascendant 1", 22: "Ascendant 2", 23: "Ascendant 3",
  24: "Immortal 1", 25: "Immortal 2", 26: "Immortal 3",
  27: "Radiant",
};

export const getValorantRankIcon = (tier: number | string | null | undefined): string | null => {
  if (tier === null || tier === undefined) return null;
  const num = typeof tier === "string" ? parseInt(tier, 10) : tier;
  if (isNaN(num) || num <= 0 || num > 27) return null;
  return `https://media.valorant-api.com/competitivetiers/${COMP_TIER_UUID}/${num}/largeicon.png`;
};

export const getValorantRankName = (tier: number | string | null | undefined): string | null => {
  if (tier === null || tier === undefined) return null;
  const num = typeof tier === "string" ? parseInt(tier, 10) : tier;
  if (isNaN(num)) return typeof tier === "string" ? tier : null;
  return VALORANT_RANK_NAMES[num] || null;
};

const formatDate = (dateStr?: string | number | null) => {
  if (!dateStr) return null;
  try {
    const d = typeof dateStr === "number" ? new Date(dateStr * 1000) : new Date(dateStr);
    if (isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return String(dateStr);
  }
};

const DetailCard = ({ icon: Icon, label, value, image }: { icon: any; label: string; value: string | number; image?: string | null }) => (
  <div className="rounded-xl bg-muted/10 border border-border/20 p-3 flex items-center gap-2.5">
    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      {image ? (
        <img src={image} alt="" className="h-5 w-5 object-contain" />
      ) : (
        <Icon className="h-4 w-4 text-primary" />
      )}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="text-sm text-foreground font-medium break-words">{String(value)}</p>
    </div>
  </div>
);

/**
 * Extract key info items for displaying on card badges.
 * Returns an array of { label, value, icon } for the card preview.
 */
export const extractAccountInfo = (lztData: any, categoryName?: string): { label: string; value: string; icon: string }[] => {
  if (!lztData || typeof lztData !== "object") return [];
  const info: { label: string; value: string; icon: string }[] = [];
  const d = lztData;
  const cat = (categoryName || "").toLowerCase();

  // Valorant
  if (cat.includes("valorant")) {
    const region = d.riot_region || d.valorant_region || d.riot_valorant_region || d.region || null;
    const lastActivity = formatDate(d.last_activity || d.lastActivity || d.item_origin_date || d.riot_last_activity);
    const currentRank = d.riot_valorant_rank || d.valorant_rank || d.rank || null;
    const rankName = getValorantRankName(currentRank);
    const level = d.riot_valorant_level || d.valorant_level || d.riot_level || d.level || d.account_level || null;

    if (rankName) info.push({ label: "Elo", value: rankName, icon: "rank" });
    if (region) info.push({ label: "Região", value: String(region).toUpperCase(), icon: "country" });
    if (level) info.push({ label: "Nível", value: String(level), icon: "level" });
    if (lastActivity) info.push({ label: "Última Atividade", value: lastActivity, icon: "clock" });
    return info;
  }

  // Fortnite
  if (cat.includes("fortnite")) {
    const vbucks = d.fortnite_vbucks || d.vbucks || d.fortniteVbucks || null;
    const region = d.fortnite_region || d.region || null;
    const lastActivity = formatDate(d.last_activity || d.lastActivity || d.item_origin_date);

    if (vbucks !== null && vbucks !== undefined) info.push({ label: "V-Bucks", value: String(vbucks), icon: "coins" });
    if (region) info.push({ label: "Região", value: String(region).toUpperCase(), icon: "country" });
    if (lastActivity) info.push({ label: "Última Atividade", value: lastActivity, icon: "clock" });
    return info;
  }

  // League of Legends
  if (cat.includes("lol") || cat.includes("league")) {
    const region = d.riot_lol_region || d.region || null;
    const level = d.riot_lol_level || null;
    const rank = d.riot_lol_rank || null;

    if (rank && rank !== "Unranked") info.push({ label: "Elo", value: String(rank), icon: "rank" });
    if (region) info.push({ label: "Região", value: String(region).toUpperCase(), icon: "country" });
    if (level) info.push({ label: "Nível", value: String(level), icon: "level" });
    return info;
  }

  // Genshin Impact
  if (cat.includes("genshin")) {
    const level = d.genshin_level || d.adventureLevel || d.adventure_rank || null;
    const achievements = d.genshin_achievements || d.achievements || null;
    const region = d.mihoyo_region || d.region || d.genshin_region || null;
    const chars = d.genshinCharacters || [];
    const fiveStarCount = Array.isArray(chars) ? chars.filter((c: any) => c.rarity >= 5).length : 0;

    if (level) info.push({ label: "Adventure Rank", value: String(level), icon: "level" });
    if (fiveStarCount > 0) info.push({ label: "5★ Chars", value: String(fiveStarCount), icon: "star" });
    if (region) info.push({ label: "Região", value: String(region).toUpperCase(), icon: "country" });
    if (achievements) info.push({ label: "Conquistas", value: String(achievements), icon: "trophy" });
    return info;
  }

  // Honkai Star Rail
  if (cat.includes("honkai")) {
    const level = d.honkai_level || d.trailblaze_level || null;
    const achievements = d.honkai_achievements || d.achievements || null;
    const region = d.mihoyo_region || d.region || d.honkai_region || null;
    const chars = d.honkaiCharacters || [];
    const fiveStarCount = Array.isArray(chars) ? chars.filter((c: any) => c.rarity >= 5).length : 0;

    if (level) info.push({ label: "Nível", value: String(level), icon: "level" });
    if (fiveStarCount > 0) info.push({ label: "5★ Chars", value: String(fiveStarCount), icon: "star" });
    if (region) info.push({ label: "Região", value: String(region).toUpperCase(), icon: "country" });
    if (achievements) info.push({ label: "Conquistas", value: String(achievements), icon: "trophy" });
    return info;
  }

  // Zenless Zone Zero
  if (cat.includes("zenless")) {
    const level = d.zenless_level || d.inter_knot_level || null;
    const achievements = d.zenless_achievements || d.achievements || null;
    const region = d.mihoyo_region || d.region || d.zenless_region || null;

    if (level) info.push({ label: "Nível", value: String(level), icon: "level" });
    if (region) info.push({ label: "Região", value: String(region).toUpperCase(), icon: "country" });
    if (achievements) info.push({ label: "Conquistas", value: String(achievements), icon: "trophy" });
    return info;
  }

  // Minecraft
  if (cat.includes("minecraft")) {
    const canChangeNick = d.minecraft_can_change_nick ?? d.canChangeNick ?? d.mc_change_nick ?? null;
    const hasJava = Boolean(d.minecraft_java ?? d.javaEdition ?? d.mc_java);
    const hasBedrock = Boolean(d.minecraft_bedrock ?? d.bedrockEdition ?? d.mc_bedrock);

    if (hasJava) info.push({ label: "Java", value: "✅ Sim", icon: "platform" });
    if (hasBedrock) info.push({ label: "Bedrock", value: "✅ Sim", icon: "platform" });
    if (canChangeNick !== null) info.push({ label: "Trocar Nick", value: canChangeNick ? "✅ Sim" : "❌ Não", icon: "verified" });
    return info;
  }

  // Telegram
  if (cat.includes("telegram")) {
    const countryFlag = (code: string): string => {
      if (!code || code.length !== 2) return "🌍";
      const codePoints = code.toUpperCase().split("").map(c => 127397 + c.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    };
    if (d.telegram_country) info.push({ label: "País", value: `${countryFlag(d.telegram_country)} ${d.telegram_country}`, icon: "country" });
    if (d.telegram_last_seen) {
      const ts = d.telegram_last_seen;
      const date = new Date(ts * 1000);
      const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
      const value = diffDays === 0 ? "Hoje" : diffDays === 1 ? "Ontem" : `${diffDays} dias atrás`;
      info.push({ label: "Último Login", value, icon: "clock" });
    }
    if (d.telegram_spam_block !== undefined) info.push({ label: "Spam Block", value: d.telegram_spam_block === -1 ? "✅ Limpo" : "⚠️ Sim", icon: "spam" });
    if (d.telegram_premium !== undefined) info.push({ label: "Premium", value: d.telegram_premium ? "⭐ Sim" : "Não", icon: "premium" });
    return info;
  }

  // Discord
  if (cat.includes("discord")) {
    const countryFlag = (code: string): string => {
      if (!code || code.length !== 2) return "🌍";
      const codePoints = code.toUpperCase().split("").map(c => 127397 + c.charCodeAt(0));
      return String.fromCodePoint(...codePoints);
    };
    if (d.discord_country) info.push({ label: "País", value: `${countryFlag(d.discord_country)} ${d.discord_country}`, icon: "country" });
    if (d.discordAccountConditionLabel) info.push({ label: "Condição", value: d.discordAccountConditionLabel, icon: "condition" });
    if (d.discordNitroType && d.discordNitroType !== "No") info.push({ label: "Nitro", value: d.discordNitroType, icon: "premium" });
    if (d.discord_verified !== undefined) info.push({ label: "Verificado", value: d.discord_verified ? "✅ Sim" : "Não", icon: "verified" });
    return info;
  }

  // Steam
  if (cat.includes("steam")) {
    const games = d.steam_game_count || d.gameCount || null;
    const level = d.steam_level || d.level || null;
    const region = d.steam_region || d.region || null;

    if (games) info.push({ label: "Jogos", value: String(games), icon: "platform" });
    if (level) info.push({ label: "Nível", value: String(level), icon: "level" });
    if (region) info.push({ label: "País", value: String(region).toUpperCase(), icon: "country" });
    return info;
  }

  // Generic fallback
  const category = d.category?.category_title;
  if (category) info.push({ label: "Plataforma", value: category, icon: "platform" });
  if (d.published_date) {
    const days = Math.floor((Date.now() / 1000 - d.published_date) / 86400);
    info.push({ label: "Idade", value: `${days}+ dias`, icon: "age" });
  }
  if (d.itemOriginPhrase) info.push({ label: "Origem", value: d.itemOriginPhrase, icon: "origin" });

  return info;
};

const AccountDetails = ({ lztData, categoryName }: AccountDetailsProps) => {
  if (!lztData) return null;
  const d = lztData;
  const cat = (categoryName || "").toLowerCase();

  // --- VALORANT ---
  if (cat.includes("valorant")) {
    const region = d.riot_region || d.valorant_region || d.riot_valorant_region || d.region || null;
    const lastActivity = formatDate(d.last_activity || d.lastActivity || d.item_origin_date || d.riot_last_activity);
    const currentRank = d.riot_valorant_rank || d.valorant_rank || d.rank || null;
    const lastRank = d.riot_valorant_last_rank || d.riot_valorant_previous_rank || d.valorant_previous_rank || d.previous_rank || null;
    const mmr = d.riot_valorant_mmr ?? d.valorant_mmr ?? d.mmr ?? null;
    const emailVerified = d.email_verified ?? d.emailVerified ?? d.riot_email_verified ?? null;
    const phoneVerified = d.phone_verified ?? d.phoneVerified ?? d.riot_phone_verified ?? null;
    const accountLevel = d.riot_valorant_level ?? d.valorant_level ?? d.riot_level ?? d.level ?? d.account_level ?? null;
    const hasData = region || lastActivity || currentRank || lastRank || mmr !== null || emailVerified !== null || phoneVerified !== null || accountLevel;
    if (!hasData) return null;

    const rankIcon = getValorantRankIcon(currentRank);
    const rankName = getValorantRankName(currentRank);
    const lastRankName = getValorantRankName(lastRank);

    return (
      <div className="space-y-3">
        <h4 className="text-xs font-display text-muted-foreground uppercase tracking-wider">Detalhes da conta</h4>
        <div className="grid grid-cols-2 gap-2">
          {region && <DetailCard icon={Globe} label="Região" value={String(region).toUpperCase()} />}
          {accountLevel && <DetailCard icon={BarChart3} label="Nível" value={accountLevel} />}
          {lastActivity && <DetailCard icon={Calendar} label="Última Atividade" value={lastActivity} />}
          {rankName && <DetailCard icon={Trophy} label="Elo Atual" value={rankName} image={rankIcon} />}
          {lastRankName && <DetailCard icon={Swords} label="Último Elo" value={lastRankName} image={getValorantRankIcon(lastRank)} />}
          {mmr !== null && mmr !== undefined && String(mmr).trim() !== "" && <DetailCard icon={BarChart3} label="MMR" value={mmr} />}
          {emailVerified !== null && <DetailCard icon={Mail} label="Email Verificado" value={emailVerified ? "Sim" : "Não"} />}
          {phoneVerified !== null && <DetailCard icon={Phone} label="Telefone" value={phoneVerified ? "Verificado" : "Não"} />}
        </div>
      </div>
    );
  }

  // --- FORTNITE ---
  if (cat.includes("fortnite")) {
    const vbucks = d.fortnite_vbucks || d.vbucks || d.fortniteVbucks || null;
    const region = d.fortnite_region || d.region || null;
    const lastActivity = formatDate(d.last_activity || d.lastActivity || d.item_origin_date);
    const hasData = region || lastActivity || vbucks;
    if (!hasData) return null;

    return (
      <div className="space-y-3">
        <h4 className="text-xs font-display text-muted-foreground uppercase tracking-wider">Detalhes da conta</h4>
        <div className="grid grid-cols-2 gap-2">
          {vbucks !== null && <DetailCard icon={Coins} label="V-Bucks" value={vbucks} />}
          {region && <DetailCard icon={Globe} label="Região" value={String(region).toUpperCase()} />}
          {lastActivity && <DetailCard icon={Calendar} label="Última Atividade" value={lastActivity} />}
        </div>
      </div>
    );
  }

  // --- LEAGUE OF LEGENDS ---
  if (cat.includes("lol") || cat.includes("league")) {
    const region = d.riot_lol_region || d.region || null;
    const level = d.riot_lol_level || null;
    const rank = d.riot_lol_rank || null;

    return (
      <div className="space-y-3">
        <h4 className="text-xs font-display text-muted-foreground uppercase tracking-wider">Detalhes da conta</h4>
        <div className="grid grid-cols-2 gap-2">
          {region && <DetailCard icon={Globe} label="Região" value={String(region).toUpperCase()} />}
          {level && <DetailCard icon={BarChart3} label="Nível" value={level} />}
          {rank && rank !== "Unranked" && <DetailCard icon={Trophy} label="Elo" value={rank} />}
        </div>
      </div>
    );
  }

  // --- GENSHIN ---
  if (cat.includes("genshin")) {
    const chars: any[] = d.genshinCharacters || [];
    const level = d.genshin_level || d.adventureLevel || d.adventure_rank || null;
    const achievements = d.genshin_achievements || d.achievements || null;
    const region = d.mihoyo_region || d.region || d.genshin_region || null;
    const fiveStarCount = chars.filter((c: any) => c.rarity >= 5).length;

    return (
      <div className="space-y-3">
        <h4 className="text-xs font-display text-muted-foreground uppercase tracking-wider">Detalhes da conta</h4>
        <div className="grid grid-cols-2 gap-2">
          {region && <DetailCard icon={Globe} label="Região" value={String(region).toUpperCase()} />}
          {level && <DetailCard icon={BarChart3} label="Adventure Rank" value={level} />}
          {achievements && <DetailCard icon={Trophy} label="Conquistas" value={achievements} />}
          {fiveStarCount > 0 && <DetailCard icon={Star} label="5★ Personagens" value={fiveStarCount} />}
        </div>
      </div>
    );
  }

  // --- HONKAI ---
  if (cat.includes("honkai")) {
    const chars: any[] = d.honkaiCharacters || [];
    const level = d.honkai_level || d.trailblaze_level || null;
    const achievements = d.honkai_achievements || d.achievements || null;
    const region = d.mihoyo_region || d.region || d.honkai_region || null;
    const fiveStarCount = chars.filter((c: any) => c.rarity >= 5).length;

    return (
      <div className="space-y-3">
        <h4 className="text-xs font-display text-muted-foreground uppercase tracking-wider">Detalhes da conta</h4>
        <div className="grid grid-cols-2 gap-2">
          {region && <DetailCard icon={Globe} label="Região" value={String(region).toUpperCase()} />}
          {level && <DetailCard icon={BarChart3} label="Nível" value={level} />}
          {achievements && <DetailCard icon={Trophy} label="Conquistas" value={achievements} />}
          {fiveStarCount > 0 && <DetailCard icon={Star} label="5★ Personagens" value={fiveStarCount} />}
        </div>
      </div>
    );
  }

  // --- GENERIC / TELEGRAM / DISCORD ---
  const genericInfo = extractAccountInfo(lztData, categoryName);
  if (genericInfo.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-display text-muted-foreground uppercase tracking-wider">Detalhes da conta</h4>
      <div className="grid grid-cols-2 gap-2">
        {genericInfo.map((item, i) => {
          const iconMap: Record<string, any> = {
            country: Globe, clock: Calendar, spam: Shield, premium: Star,
            coins: Coins, rank: Trophy, level: BarChart3, star: Star,
            trophy: Trophy, platform: UserCheck, verified: Shield,
            condition: Shield, age: Calendar, origin: Globe,
          };
          const IconComp = iconMap[item.icon] || Globe;
          return <DetailCard key={i} icon={IconComp} label={item.label} value={item.value} />;
        })}
      </div>
    </div>
  );
};

export default AccountDetails;
