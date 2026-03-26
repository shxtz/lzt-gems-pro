import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/supabase-resilience";
import { motion } from "framer-motion";
import {
  ArrowLeft, ShoppingCart, Globe, Calendar, Shield, Star, Trophy,
  BarChart3, Coins, Mail, Phone, Clock, Gamepad2, Loader2, Crosshair,
  Sword, Send, MessageCircle, Eye, Zap, Tag, Hash, Users, Bot, Crown, Key, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getLztAccountImageUrl, getLztInventoryImages } from "@/lib/lzt-image";
import { getValorantRankIcon, getValorantRankName } from "@/components/AccountDetails";
import ValorantInventoryFull from "@/components/ValorantInventory";
import GameInventoryFull from "@/components/inventory/GameInventoryFull";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { fetchEdgeJson } from "@/lib/fetchEdgeJson";
import { getLoLQuickPreviewItems, prewarmChampionsCatalog } from "@/lib/lol-api";
import { getGamePreviewItems, getLoLRankIcon, type GamePreviewItem } from "@/lib/game-preview";
import RecommendedAccounts from "@/components/marketing/RecommendedAccounts";
import CrossSellBanner from "@/components/marketing/CrossSellBanner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/* ── helpers ────────────────────────────────────────────── */

const formatDate = (v?: string | number | null) => {
  if (!v) return null;
  const d = typeof v === "number" ? new Date(v * 1000) : new Date(v);
  return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("pt-BR");
};

const countryFlag = (c: string) => {
  if (!c || c.length !== 2) return "🌍";
  return String.fromCodePoint(...c.toUpperCase().split("").map(ch => 127397 + ch.charCodeAt(0)));
};

const CATEGORY_THEMES: Record<string, { gradient: string; accent: string; Icon: any }> = {
  telegram: { gradient: "from-[#0088cc] via-[#0077b5] to-[#005f8d]", accent: "#0088cc", Icon: Send },
  discord: { gradient: "from-[#5865F2] via-[#4752c4] to-[#3c45a5]", accent: "#5865F2", Icon: MessageCircle },
  valorant: { gradient: "from-[#ff4655] via-[#bd3944] to-[#53212a]", accent: "#ff4655", Icon: Crosshair },
  riot: { gradient: "from-[#ff4655] via-[#bd3944] to-[#53212a]", accent: "#ff4655", Icon: Crosshair },
  fortnite: { gradient: "from-[#9d4dbb] via-[#7b2d9e] to-[#4a1a5e]", accent: "#9d4dbb", Icon: Sword },
  genshin: { gradient: "from-[#c8a96e] via-[#a88b4a] to-[#6b5a30]", accent: "#c8a96e", Icon: Star },
  honkai: { gradient: "from-[#6c5ce7] via-[#5a4bd1] to-[#3d2d9e]", accent: "#6c5ce7", Icon: Star },
  lol: { gradient: "from-[#c89b3c] via-[#a67c2e] to-[#785a1e]", accent: "#c89b3c", Icon: Trophy },
  steam: { gradient: "from-[#1b2838] via-[#2a475e] to-[#1b2838]", accent: "#66c0f4", Icon: Gamepad2 },
  minecraft: { gradient: "from-[#5d8c3e] via-[#4a7a2e] to-[#3a6220]", accent: "#5d8c3e", Icon: Gamepad2 },
  zzz: { gradient: "from-[#f5d442] via-[#d6ab29] to-[#473d1d]", accent: "#f5d442", Icon: Zap },
  brawl: { gradient: "from-[#f7c948] via-[#e6a817] to-[#c48a0e]", accent: "#f7c948", Icon: Star },
  default: { gradient: "from-primary/80 via-primary/50 to-primary/20", accent: "hsl(43,84%,55%)", Icon: Gamepad2 },
};

const getTheme = (cat: string) => {
  const n = cat.toLowerCase();
  for (const [k, t] of Object.entries(CATEGORY_THEMES)) {
    if (k !== "default" && n.includes(k)) return t;
  }
  return CATEGORY_THEMES.default;
};

const GAME_PREFIX_MAP: Record<string, string> = {
  valorant: "VAL", riot: "VAL", fortnite: "FN", lol: "LOL", league: "LOL",
  genshin: "GI", honkai: "HSR", minecraft: "MC", steam: "STM",
  telegram: "TG", discord: "DC", zzz: "ZZZ", brawl: "BS",
};

const getGamePrefix = (cat: string): string => {
  const n = cat.toLowerCase();
  for (const [k, prefix] of Object.entries(GAME_PREFIX_MAP)) {
    if (n.includes(k)) return prefix;
  }
  return "ACC";
};

const getMaskedName = (cat: string, lztItemId: string): string => {
  const prefix = getGamePrefix(cat);
  const hash = Math.abs([...lztItemId].reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0));
  const num = String(hash).slice(-5).padStart(5, "0");
  return `${prefix}-VB#${num}`;
};

/* ── Stat card ──────────────────────────────────────────── */

const Stat = ({ icon: Icon, label, value, image, highlight }: {
  icon: any; label: string; value: string | number; image?: string | null; highlight?: boolean;
}) => (
  <div className={`rounded-xl border p-4 flex items-center gap-3 transition-all ${
    highlight ? "bg-primary/10 border-primary/30" : "bg-muted/10 border-border/20"
  }`}>
    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
      highlight ? "bg-primary/20" : "bg-muted/20"
    }`}>
      {image ? <img src={image} alt="" className="h-6 w-6 object-contain" /> : <Icon className={`h-5 w-5 ${highlight ? "text-primary" : "text-muted-foreground"}`} />}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">{label}</p>
      <p className={`text-sm font-semibold break-words whitespace-normal ${highlight ? "text-primary" : "text-foreground"}`}>{String(value)}</p>
    </div>
  </div>
);

/* ── Image gallery helpers ──────────────────────────────── */

function getAllPreviewImages(data: any, cat: string): { label: string; url: string }[] {
  const images: { label: string; url: string }[] = [];
  const links = data?.imagePreviewLinks || data?.image_preview_links;
  if (!links) return images;

  const LABEL_MAP: Record<string, string> = {
    weapons: "Armas", agents: "Agentes", buddies: "Buddies", skins: "Skins",
    pickaxes: "Picaretas", emotes: "Emotes", gliders: "Planadores",
    characters: "Personagens", champions: "Campeões", brawlers: "Brawlers",
    games: "Jogos", inventory: "Inventário", profile: "Perfil",
  };

  for (const source of [links.download, links.direct]) {
    if (!source || typeof source !== "object") continue;
    for (const [key, url] of Object.entries(source)) {
      if (typeof url !== "string" || images.some(i => i.label === (LABEL_MAP[key] || key))) continue;
      const proxied = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/lzt-proxy?image_url=${encodeURIComponent(url)}` : url;
      images.push({ label: LABEL_MAP[key] || key, url: proxied });
    }
  }
  return images;
}

/* ── Game-specific renderers ────────────────────────────── */

function ValorantInventory({ data }: { data: any }) {
  const rank = data?.riot_valorant_rank || data?.valorant_rank || data?.rank;
  const lastRank = data?.riot_valorant_last_rank || data?.riot_valorant_previous_rank;
  const level = data?.riot_valorant_level || data?.valorant_level || data?.riot_level || data?.level;
  const region = data?.riot_region || data?.valorant_region || data?.region;
  const mmr = data?.riot_valorant_mmr ?? data?.valorant_mmr ?? data?.mmr;
  const emailVerified = data?.email_verified ?? data?.emailVerified ?? data?.riot_email_verified;
  const phoneVerified = data?.phone_verified ?? data?.phoneVerified ?? data?.riot_phone_verified;
  const lastActivity = formatDate(data?.last_activity || data?.lastActivity || data?.riot_last_activity);

  const rankIcon = getValorantRankIcon(rank);
  const rankName = getValorantRankName(rank);
  const lastRankIcon = getValorantRankIcon(lastRank);
  const lastRankName = getValorantRankName(lastRank);

  return (
    <div className="space-y-4">
      {/* Rank highlight */}
      {rankName && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-center gap-4">
          {rankIcon && <img src={rankIcon} alt={rankName} className="h-16 w-16 object-contain drop-shadow-lg" />}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">Elo Atual</p>
            <p className="text-2xl font-bold text-primary font-display">{rankName}</p>
            {mmr !== null && mmr !== undefined && <p className="text-xs text-muted-foreground mt-0.5">MMR: {mmr}</p>}
          </div>
          {lastRankName && lastRankName !== rankName && (
            <div className="ml-auto text-right">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">Último Elo</p>
              <div className="flex items-center gap-2 mt-1">
                {lastRankIcon && <img src={lastRankIcon} alt={lastRankName} className="h-8 w-8 object-contain" />}
                <span className="text-sm text-foreground">{lastRankName}</span>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {level && <Stat icon={BarChart3} label="Nível" value={level} />}
        {region && <Stat icon={Globe} label="Região" value={String(region).toUpperCase()} />}
        {lastActivity && <Stat icon={Calendar} label="Última Atividade" value={lastActivity} />}
        {emailVerified !== null && emailVerified !== undefined && <Stat icon={Mail} label="Email Verificado" value={emailVerified ? "✅ Sim" : "❌ Não"} />}
        {phoneVerified !== null && phoneVerified !== undefined && <Stat icon={Phone} label="Telefone" value={phoneVerified ? "✅ Verificado" : "❌ Não"} />}
      </div>
    </div>
  );
}

function FortniteInventory({ data }: { data: any }) {
  const vbucks = data?.fortnite_balance || data?.fortnite_vbucks || data?.vbucks;
  const level = data?.fortnite_level || data?.fortnite_book_level;
  const lastActivity = formatDate(data?.last_activity || data?.lastActivity);
  const region = data?.fortnite_region || data?.region;
  const skinCount = Array.isArray(data?.fortniteSkins) ? data.fortniteSkins.length : 0;
  const danceCount = Array.isArray(data?.fortniteDance) ? data.fortniteDance.length : 0;
  const pickaxeCount = Array.isArray(data?.fortnitePickaxe) ? data.fortnitePickaxe.length : 0;
  const gliderCount = Array.isArray(data?.fortniteGliders) ? data.fortniteGliders.length : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {level && <Stat icon={BarChart3} label="Nível" value={level} highlight />}
      {vbucks !== null && vbucks !== undefined && <Stat icon={Coins} label="V-Bucks" value={Number(vbucks).toLocaleString("pt-BR")} highlight />}
      {skinCount > 0 && <Stat icon={Sword} label="Skins" value={skinCount} highlight />}
      {danceCount > 0 && <Stat icon={Star} label="Danças" value={danceCount} />}
      {pickaxeCount > 0 && <Stat icon={Tag} label="Picaretas" value={pickaxeCount} />}
      {gliderCount > 0 && <Stat icon={Shield} label="Planadores" value={gliderCount} />}
      {region && <Stat icon={Globe} label="Região" value={String(region).toUpperCase()} />}
      {lastActivity && <Stat icon={Calendar} label="Última Atividade" value={lastActivity} />}
    </div>
  );
}

function LoLInventory({ data }: { data: any }) {
  const region = data?.riot_lol_region || data?.region;
  const level = data?.riot_lol_level;
  const rank = data?.riot_lol_rank;
  const rankIcon = getLoLRankIcon(rank);

  return (
    <div className="space-y-4">
      {rank && rank !== "Unranked" && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 flex items-center gap-4">
          {rankIcon && <img src={rankIcon} alt={rank} className="h-16 w-16 object-contain drop-shadow-lg" />}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">Elo Atual</p>
            <p className="text-2xl font-bold text-primary font-display">{rank}</p>
          </div>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {level && <Stat icon={BarChart3} label="Nível" value={level} />}
        {region && <Stat icon={Globe} label="Região" value={String(region).toUpperCase()} />}
      </div>
    </div>
  );
}

function GenshinInventory({ data }: { data: any }) {
  const level = data?.genshin_level || data?.adventureLevel || data?.adventure_rank;
  const achievements = data?.genshin_achievements || data?.achievements;
  const region = data?.mihoyo_region || data?.region || data?.genshin_region;
  const chars: any[] = data?.genshinCharacters || [];
  const fiveStarCount = chars.filter((c: any) => c.rarity >= 5).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {level && <Stat icon={BarChart3} label="Adventure Rank" value={level} highlight />}
        {fiveStarCount > 0 && <Stat icon={Star} label="5★ Personagens" value={fiveStarCount} highlight />}
        {achievements && <Stat icon={Trophy} label="Conquistas" value={achievements} />}
        {region && <Stat icon={Globe} label="Região" value={String(region).toUpperCase()} />}
      </div>
      {chars.length > 0 && (
        <div>
          <h4 className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-3">Personagens</h4>
          <div className="flex flex-wrap gap-2">
            {chars.slice(0, 20).map((c: any, i: number) => (
              <div key={i} className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border ${c.rarity >= 5 ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/10 border-border/20 text-foreground"}`}>
                {c.name || `Char ${i + 1}`} {c.rarity >= 5 && "⭐"}
              </div>
            ))}
            {chars.length > 20 && <div className="rounded-lg px-2.5 py-1 text-[11px] text-muted-foreground bg-muted/10 border border-border/20">+{chars.length - 20} mais</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function HonkaiInventory({ data }: { data: any }) {
  const level = data?.honkai_level || data?.trailblaze_level;
  const achievements = data?.honkai_achievements || data?.achievements;
  const region = data?.mihoyo_region || data?.region || data?.honkai_region;
  const chars: any[] = data?.honkaiCharacters || [];
  const fiveStarCount = chars.filter((c: any) => c.rarity >= 5).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {level && <Stat icon={BarChart3} label="Nível" value={level} highlight />}
        {fiveStarCount > 0 && <Stat icon={Star} label="5★ Personagens" value={fiveStarCount} highlight />}
        {achievements && <Stat icon={Trophy} label="Conquistas" value={achievements} />}
        {region && <Stat icon={Globe} label="Região" value={String(region).toUpperCase()} />}
      </div>
      {chars.length > 0 && (
        <div>
          <h4 className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-3">Personagens</h4>
          <div className="flex flex-wrap gap-2">
            {chars.slice(0, 20).map((c: any, i: number) => (
              <div key={i} className={`rounded-lg px-2.5 py-1 text-[11px] font-medium border ${c.rarity >= 5 ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/10 border-border/20 text-foreground"}`}>
                {c.name || `Char ${i + 1}`} {c.rarity >= 5 && "⭐"}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TelegramInventory({ data }: { data: any }) {
  const country = data?.telegram_country;
  const lastSeen = data?.telegram_last_seen;
  const spamBlock = data?.telegram_spam_block;
  const premium = data?.telegram_premium;
  const dcId = data?.telegram_dc_id;
  const chats = data?.telegram_chats_count;
  const channels = data?.telegram_channels_count;
  const contacts = data?.telegram_contacts_count;
  const bots = data?.telegram_bots_count;
  const conversations = data?.telegram_conversations_count;
  const groups = data?.telegram_group_counters;
  const stars = data?.telegram_stars_count;
  const gifts = data?.telegram_gifts_count;
  const birthday = data?.telegram_birthday;
  const password = data?.telegram_password;

  const lastSeenStr = lastSeen ? (() => {
    const d = Math.floor((Date.now() / 1000 - lastSeen) / 86400);
    return d === 0 ? "Hoje" : d === 1 ? "Ontem" : `${d} dias atrás`;
  })() : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {country && <Stat icon={Globe} label="País" value={`${countryFlag(country)} ${country}`} />}
      {lastSeenStr && <Stat icon={Clock} label="Último Login" value={lastSeenStr} />}
      {spamBlock !== undefined && <Stat icon={Shield} label="Spam Block" value={spamBlock === -1 ? "✅ Limpo" : "⚠️ Sim"} highlight={spamBlock === -1} />}
      {premium !== undefined && <Stat icon={Crown} label="Premium" value={premium ? "⭐ Sim" : "Não"} highlight={!!premium} />}
      {dcId && <Stat icon={Hash} label="Data Center" value={`DC ${dcId}`} />}
      {conversations !== undefined && <Stat icon={MessageCircle} label="Conversas" value={conversations} />}
      {chats !== undefined && <Stat icon={Users} label="Grupos" value={chats} />}
      {channels !== undefined && <Stat icon={Send} label="Canais" value={channels} />}
      {contacts !== undefined && <Stat icon={Users} label="Contatos" value={contacts} />}
      {bots !== undefined && bots > 0 && <Stat icon={Bot} label="Bots" value={bots} />}
      {stars !== undefined && stars > 0 && <Stat icon={Star} label="Stars" value={stars} />}
      {gifts !== undefined && gifts > 0 && <Stat icon={Tag} label="Presentes" value={gifts} />}
      {password !== undefined && <Stat icon={Shield} label="2FA" value={password ? "✅ Ativo" : "❌ Inativo"} />}
      {birthday !== undefined && birthday > 0 && <Stat icon={Calendar} label="Aniversário" value="Configurado" />}
    </div>
  );
}

function DiscordInventory({ data }: { data: any }) {
  const country = data?.discord_country;
  const condition = data?.discordAccountConditionLabel;
  const nitro = data?.discordNitroType;
  const verified = data?.discord_verified;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {country && <Stat icon={Globe} label="País" value={`${countryFlag(country)} ${country}`} />}
      {condition && <Stat icon={Shield} label="Condição" value={condition} />}
      {nitro && nitro !== "No" && <Stat icon={Crown} label="Nitro" value={nitro} highlight />}
      {verified !== undefined && <Stat icon={Shield} label="Verificado" value={verified ? "✅ Sim" : "❌ Não"} />}
    </div>
  );
}

function SteamInventory({ data }: { data: any }) {
  const games = data?.steam_game_count || data?.gameCount;
  const level = data?.steam_level || data?.level;
  const region = data?.steam_region || data?.region;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {games && <Stat icon={Gamepad2} label="Jogos" value={games} highlight />}
      {level && <Stat icon={BarChart3} label="Nível Steam" value={level} />}
      {region && <Stat icon={Globe} label="País" value={String(region).toUpperCase()} />}
    </div>
  );
}

function MinecraftInventory({ data }: { data: any }) {
  const hasJava = Boolean(data?.minecraft_java ?? data?.javaEdition ?? data?.mc_java);
  const hasBedrock = Boolean(data?.minecraft_bedrock ?? data?.bedrockEdition ?? data?.mc_bedrock);
  const canChangeNick = data?.minecraft_can_change_nick ?? data?.canChangeNick ?? data?.mc_change_nick;
  const nickname = data?.minecraft_nickname;
  const capeCount = Array.isArray(data?.minecraft_capes) ? data.minecraft_capes.length : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {hasJava && <Stat icon={Gamepad2} label="Java Edition" value="✅ Incluso" highlight />}
      {hasBedrock && <Stat icon={Gamepad2} label="Bedrock Edition" value="✅ Incluso" highlight />}
      {nickname && <Stat icon={Key} label="Nick" value={nickname} />}
      {capeCount > 0 && <Stat icon={Shield} label="Capas" value={capeCount} highlight />}
      {canChangeNick !== null && canChangeNick !== undefined && <Stat icon={Tag} label="Trocar Nick" value={canChangeNick ? "✅ Sim" : "❌ Não"} />}
    </div>
  );
}

function ZZZInventory({ data }: { data: any }) {
  const agents: any[] = data?.zzzCharacters || data?.zenlessCharacters || [];
  const sRankCount = agents.filter((agent: any) => `${agent?.rarityIcon || agent?.weapon?.rarityIcon || ""}`.toLowerCase().includes("rarity-s") || Number(agent?.rarity ?? 0) >= 2).length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {agents.length > 0 && <Stat icon={Users} label="Agentes" value={agents.length} highlight />}
        {sRankCount > 0 && <Stat icon={Star} label="S-Rank" value={sRankCount} highlight />}
      </div>
    </div>
  );
}

function GenericInventory({ data }: { data: any }) {
  const category = data?.category?.category_title;
  const origin = data?.itemOriginPhrase;
  const published = data?.published_date;
  const days = published ? Math.floor((Date.now() / 1000 - published) / 86400) : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {category && <Stat icon={Tag} label="Plataforma" value={category} />}
      {origin && <Stat icon={Globe} label="Origem" value={origin} />}
      {days !== null && <Stat icon={Calendar} label="Idade" value={`${days}+ dias`} />}
    </div>
  );
}

function GameInventory({ data, cat }: { data: any; cat: string }) {
  const c = cat.toLowerCase();
  const hasValInv = !!data?.valorantInventory || !!data?.riot_valorant_rank;
  const isLoL = c.includes("league") || c.includes("lol");
  if (((c.includes("valorant") || c.includes("riot")) && !isLoL) || (hasValInv && !isLoL)) return <ValorantInventory data={data} />;
  if (c.includes("fortnite")) return <FortniteInventory data={data} />;
  if (isLoL) return <LoLInventory data={data} />;
  if (c.includes("genshin")) return <GenshinInventory data={data} />;
  if (c.includes("honkai")) return <HonkaiInventory data={data} />;
  if (c.includes("zenless") || c.includes("zzz")) return <ZZZInventory data={data} />;
  if (c.includes("telegram")) return <TelegramInventory data={data} />;
  if (c.includes("discord")) return <DiscordInventory data={data} />;
  if (c.includes("steam")) return <SteamInventory data={data} />;
  if (c.includes("minecraft")) return <MinecraftInventory data={data} />;
  return <GenericInventory data={data} />;
}

/* ── Main Page ──────────────────────────────────────────── */

const AccountPreview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, authReady, isAdmin } = useAuth();

  const { data: account, isLoading } = useQuery({
    queryKey: ["account-preview", id],
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("lzt_accounts")
            .select("*")
            .eq("id", id!)
            .maybeSingle(),
        );
        if (error) throw error;
        return data;
      } catch {
        return null;
      }
    },
    enabled: authReady && !!id,
  });

  const { data: lztCategory } = useQuery({
    queryKey: ["lzt-cat", account?.category_id],
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("lzt_categories")
            .select("name")
            .eq("id", account!.category_id)
            .maybeSingle(),
        );
        if (error) throw error;
        return data;
      } catch {
        return null;
      }
    },
    enabled: authReady && !!account?.category_id,
  });

  const d = account?.data as any;
  const valInventory = d?.valorantInventory;
  const hasValInventory = !!(valInventory && typeof valInventory === "object");

  // Use admin category name for game detection (more reliable than LZT platform name)
  const adminCategoryName = lztCategory?.name || "Conta";
  const realCategory = adminCategoryName;
  const catLower = realCategory.toLowerCase();
  const isValorantAccount = catLower.includes("valorant") || (catLower.includes("riot") && !catLower.includes("league") && !catLower.includes("lol"));
  const isLoLAccount = catLower.includes("league") || catLower.includes("lol");

  // Fetch enriched inventory from edge function for the 3x3 grid
  const { data: enrichedInventory } = useQuery({
    queryKey: ["enriched-inventory", account?.id],
    queryFn: async () => {
      const data = await fetchEdgeJson(
        `${SUPABASE_URL}/functions/v1/valorant-inventory?account_id=${account!.id}`,
        { retries: 3, retryDelayMs: 600 }
      );
      return data;
    },
    enabled: !!account?.id && hasValInventory && isValorantAccount,
    staleTime: 5 * 60 * 1000,
  });

  useQuery({
    queryKey: ["lol-preview-catalog"],
    queryFn: async () => {
      await prewarmChampionsCatalog();
      return true;
    },
    enabled: isLoLAccount,
    staleTime: 60 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 text-center">
          <Gamepad2 className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-display text-foreground">Conta não encontrada</h2>
          <p className="text-sm text-muted-foreground mt-2">Esta conta pode ter sido vendida ou removida.</p>
          <Button onClick={() => navigate("/loja")} className="mt-6">Voltar à Loja</Button>
        </div>
      </div>
    );
  }

  const theme = getTheme(realCategory);
  const CategoryIcon = theme.Icon;
  const mainImage = getLztAccountImageUrl(d, realCategory);
  const lztInv = getLztInventoryImages(d);

  const enrichedSkins = enrichedInventory?.skins || [];
  const lolPreviewItems = isLoLAccount ? getLoLQuickPreviewItems(d?.lolInventory, 9) : [];

  // Unified preview tiles for ALL games
  const gamePreviewItems = (!isValorantAccount && !isLoLAccount) ? getGamePreviewItems(d, realCategory, 9) : [];

  const previewTiles = isLoLAccount
    ? lolPreviewItems.map((item) => ({
        id: String(item.id),
        image: item.imageUrl,
        alt: item.skinName,
        tier: item.tier,
      }))
    : isValorantAccount
      ? enrichedSkins.map((skin: any) => ({
          id: skin.uuid,
          image: skin.icon,
          alt: skin.name,
          tier: skin.tier,
          tierIcon: skin.tierIcon,
        }))
      : gamePreviewItems.map((item) => ({
          id: item.id,
          image: item.imageUrl,
          alt: item.name,
          tier: item.tier,
          tierIcon: item.tierIcon,
        }));

  const hasIndividualItems = previewTiles.length > 0;
  // Only use LZT images as fallback when no individual items exist
  const lztInvForDisplay = !hasIndividualItems ? lztInv : { weapons: null, agents: null, buddies: null };
  const hasInventory = hasIndividualItems || Object.values(lztInvForDisplay).some(v => v !== null);
  const allImages = getAllPreviewImages(d, realCategory);

  // LoL rank icon
  const lolRank = isLoLAccount ? d?.riot_lol_rank : null;
  const lolRankIconUrl = getLoLRankIcon(lolRank);
  const maskedName = getMaskedName(realCategory, account.lzt_item_id);
  const price = Number(account.price_brl);
  const isAvailable = account.status === "available";

  // Seller info
  const seller = d?.seller;
  const sellerName = seller?.username;
  const soldCount = seller?.sold_items_count;
  const feedbackRaw = d?.feedback_data;
  let positiveFeedback = 0;
  let negativeFeedback = 0;
  if (feedbackRaw) {
    try {
      const fb = typeof feedbackRaw === "string" ? JSON.parse(feedbackRaw) : feedbackRaw;
      Object.values(fb).forEach((v: any) => {
        positiveFeedback += v?.positive || 0;
        negativeFeedback += v?.negative || 0;
      });
    } catch {}
  }

  // Extra details
  const origin = d?.itemOriginPhrase;
  const publishedDate = formatDate(d?.published_date);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Back button */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar para {realCategory}
        </Button>
      </div>

      {/* Two-column layout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-[1fr,1fr] gap-6">

          {/* LEFT — 3x3 Preview Grid + Details */}
          <div className="space-y-5">
            {/* 3x3 Preview Grid */}
            {hasIndividualItems ? (
              <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                <div className="grid grid-cols-3 gap-[2px] bg-border/10">
                  {previewTiles.slice(0, 9).map((item: any, i: number) => {
                    const tier = item.tier;
                    const tileColor = tier ? `rgb(${tier.tile[0]}, ${tier.tile[1]}, ${tier.tile[2]})` : undefined;
                    const outlineColor = tier ? `rgb(${tier.outline[0]}, ${tier.outline[1]}, ${tier.outline[2]})` : undefined;
                    return (
                      <div
                        key={item.id + i}
                        className="relative aspect-square overflow-hidden bg-card"
                        style={{
                          background: tileColor
                            ? `linear-gradient(135deg, ${tileColor}, rgba(0,0,0,0.5))`
                            : undefined,
                          border: outlineColor ? `1px solid ${outlineColor}50` : undefined,
                        }}
                      >
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.alt}
                            className="absolute inset-0 w-full h-full object-contain p-3"
                            loading="lazy"
                            style={{ filter: "brightness(1.1) contrast(1.2) saturate(1.8)" }}
                            onError={(e) => { const tile = (e.target as HTMLImageElement).closest('[data-tile]'); if (tile) (tile as HTMLElement).style.display = "none"; }}
                          />
                        )}
                        {item.tierIcon && (
                          <div className="absolute top-2 right-2">
                            <img src={item.tierIcon} alt="" className="h-5 w-5 drop-shadow-md" />
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-6">
                          <p className="text-[11px] font-semibold text-white truncate drop-shadow-lg">{item.alt}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : mainImage ? (
              <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                <div className="aspect-square overflow-hidden relative">
                  <img src={mainImage} alt="" className="w-full h-full object-cover" style={{ filter: "saturate(1.2) contrast(1.05)" }} />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
                <div className={`aspect-square overflow-hidden relative bg-gradient-to-br ${theme.gradient} flex items-center justify-center`}>
                  <CategoryIcon className="h-24 w-24 text-white/15" strokeWidth={0.8} />
                </div>
              </div>
            )}

            {/* Account Details */}
            <div className="rounded-2xl border border-border/40 bg-card p-5">
              <h3 className="text-xs font-display text-muted-foreground uppercase tracking-wider mb-4">Detalhes da Conta</h3>
              <GameInventory data={d} cat={realCategory} />
            </div>
          </div>

          {/* RIGHT — Product Info */}
          <div className="space-y-5">
            {/* Title & Badge */}
            <div className="space-y-3">
              <Badge className="bg-primary/90 text-primary-foreground text-[10px] uppercase font-display tracking-wider">{realCategory}</Badge>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                {maskedName}
              </h1>
              {isAdmin && (
                <a
                  href={`https://lzt.market/${account.lzt_item_id}/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded border border-primary/30 bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary transition-colors hover:bg-primary/20"
                >
                  LZT#{account.lzt_item_id}
                </a>
              )}
              {isAvailable && (
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Disponível</span>
                </div>
              )}
            </div>

            {/* Price Card */}
            <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-3xl font-bold text-primary font-display">R$ {price.toFixed(2)}</p>
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                  <Shield className="h-3 w-3" /> Verificada
                </span>
              </div>
              {isAvailable && (
                <div className="flex gap-3">
                  <Button
                    size="lg"
                    className="flex-1 bg-gradient-gold text-primary-foreground font-display gap-2 shadow-gold"
                    onClick={() => {
                      if (!user) { toast.error("Faça login para comprar"); navigate("/auth"); return; }
                      navigate("/loja");
                      toast.info("Use a loja para finalizar a compra.");
                    }}
                  >
                    <ShoppingCart className="h-5 w-5" /> Comprar agora
                  </Button>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 text-primary"><Zap className="h-3.5 w-3.5" /> Entrega automática</span>
                <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5" /> Pagamento seguro via PIX</span>
                <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> Conta verificada</span>
              </div>
            </div>

            {/* Full Access Card */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display text-foreground font-semibold">Full Acesso</h3>
                  <p className="text-[11px] text-muted-foreground">Entrega instantânea e segura</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-background/50 border border-border/20 p-3 flex items-center gap-2.5">
                  <Key className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">E-mail + Senha</p>
                    <p className="text-[10px] text-muted-foreground">Credenciais completas</p>
                  </div>
                </div>
                <div className="rounded-xl bg-background/50 border border-border/20 p-3 flex items-center gap-2.5">
                  <Zap className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Entrega Automática</p>
                    <p className="text-[10px] text-muted-foreground">Após confirmação do Pix</p>
                  </div>
                </div>
                <div className="rounded-xl bg-background/50 border border-border/20 p-3 flex items-center gap-2.5">
                  <Gamepad2 className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Sem Restrições</p>
                    <p className="text-[10px] text-muted-foreground">Jogue sem limitações</p>
                  </div>
                </div>
                <div className="rounded-xl bg-background/50 border border-border/20 p-3 flex items-center gap-2.5">
                  <Shield className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">Conta Segura</p>
                    <p className="text-[10px] text-muted-foreground">Verificada e protegida</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-primary pt-1">
                <Check className="h-3.5 w-3.5" />
                <span>Todas as contas são verificadas e entregues com <strong>acesso completo</strong>.</span>
              </div>
            </div>
          </div>

        </motion.div>

        {/* FULL-WIDTH Inventory Section - Valorant only */}
        {isValorantAccount && valInventory && typeof valInventory === "object" && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10"
          >
            <div className="flex items-center gap-2 mb-6">
              <Crosshair className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold text-foreground">Inventário</h2>
            </div>
            <ValorantInventoryFull lztData={d} accountId={account.id} />
          </motion.div>
        )}

        {/* Non-Valorant game inventory (LoL, Genshin, Honkai, Fortnite, Minecraft, ZZZ) */}
        {!isValorantAccount && realCategory && !catLower.includes("telegram") && !catLower.includes("discord") && !catLower.includes("steam") && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-10"
          >
            <GameInventoryFull lztData={d} accountId={account.id} categoryName={realCategory} />
          </motion.div>
        )}
        {/* Cross-sell V-Bucks */}
        <div className="mt-8">
          <CrossSellBanner context="preview" />
        </div>

        {/* Recommended Accounts */}
        {account && lztCategory && (
          <RecommendedAccounts
            currentAccountId={account.id}
            categoryId={account.category_id}
            categoryName={adminCategoryName}
          />
        )}
      </div>

      <Footer />
    </div>
  );
};

export default AccountPreview;
