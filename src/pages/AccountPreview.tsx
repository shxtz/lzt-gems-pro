import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  ArrowLeft, ShoppingCart, Globe, Calendar, Shield, Star, Trophy,
  BarChart3, Coins, Mail, Phone, Clock, Gamepad2, Loader2, Crosshair,
  Sword, Send, MessageCircle, Eye, Zap, Tag, Hash, Users, Bot, Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getLztAccountImageUrl } from "@/lib/lzt-image";
import { getValorantRankIcon, getValorantRankName } from "@/components/AccountDetails";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
  fortnite: { gradient: "from-[#9d4dbb] via-[#7b2d9e] to-[#4a1a5e]", accent: "#9d4dbb", Icon: Sword },
  genshin: { gradient: "from-[#c8a96e] via-[#a88b4a] to-[#6b5a30]", accent: "#c8a96e", Icon: Star },
  honkai: { gradient: "from-[#6c5ce7] via-[#5a4bd1] to-[#3d2d9e]", accent: "#6c5ce7", Icon: Star },
  lol: { gradient: "from-[#c89b3c] via-[#a67c2e] to-[#785a1e]", accent: "#c89b3c", Icon: Trophy },
  steam: { gradient: "from-[#1b2838] via-[#2a475e] to-[#1b2838]", accent: "#66c0f4", Icon: Gamepad2 },
  minecraft: { gradient: "from-[#5d8c3e] via-[#4a7a2e] to-[#3a6220]", accent: "#5d8c3e", Icon: Gamepad2 },
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

const getShortId = (id: string) => {
  const num = parseInt(id.slice(-6), 10);
  return isNaN(num) ? id.slice(-6) : String(num);
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
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">{label}</p>
      <p className={`text-sm font-semibold truncate ${highlight ? "text-primary" : "text-foreground"}`}>{String(value)}</p>
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
  const vbucks = data?.fortnite_vbucks || data?.vbucks;
  const region = data?.fortnite_region || data?.region;
  const lastActivity = formatDate(data?.last_activity || data?.lastActivity);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {vbucks !== null && vbucks !== undefined && <Stat icon={Coins} label="V-Bucks" value={vbucks} highlight />}
      {region && <Stat icon={Globe} label="Região" value={String(region).toUpperCase()} />}
      {lastActivity && <Stat icon={Calendar} label="Última Atividade" value={lastActivity} />}
    </div>
  );
}

function LoLInventory({ data }: { data: any }) {
  const region = data?.riot_lol_region || data?.region;
  const level = data?.riot_lol_level;
  const rank = data?.riot_lol_rank;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {rank && rank !== "Unranked" && <Stat icon={Trophy} label="Elo" value={rank} highlight />}
      {level && <Stat icon={BarChart3} label="Nível" value={level} />}
      {region && <Stat icon={Globe} label="Região" value={String(region).toUpperCase()} />}
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

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {hasJava && <Stat icon={Gamepad2} label="Java Edition" value="✅ Incluso" highlight />}
      {hasBedrock && <Stat icon={Gamepad2} label="Bedrock Edition" value="✅ Incluso" highlight />}
      {canChangeNick !== null && canChangeNick !== undefined && <Stat icon={Tag} label="Trocar Nick" value={canChangeNick ? "✅ Sim" : "❌ Não"} />}
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
  if (c.includes("valorant")) return <ValorantInventory data={data} />;
  if (c.includes("fortnite")) return <FortniteInventory data={data} />;
  if (c.includes("lol") || c.includes("league")) return <LoLInventory data={data} />;
  if (c.includes("genshin")) return <GenshinInventory data={data} />;
  if (c.includes("honkai")) return <HonkaiInventory data={data} />;
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
  const { user } = useAuth();

  const { data: account, isLoading } = useQuery({
    queryKey: ["account-preview", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lzt_accounts")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: lztCategory } = useQuery({
    queryKey: ["lzt-cat", account?.category_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lzt_categories")
        .select("name")
        .eq("id", account!.category_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!account?.category_id,
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

  const d = account.data as any;
  const realCategory = d?.category?.category_name || d?.category?.category_title || lztCategory?.name || "Conta";
  const theme = getTheme(realCategory);
  const CategoryIcon = theme.Icon;
  const mainImage = getLztAccountImageUrl(d, realCategory);
  const allImages = getAllPreviewImages(d, realCategory);
  const shortId = getShortId(account.lzt_item_id);
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

      {/* Hero Banner */}
      <div className="relative">
        {mainImage ? (
          <div className="h-56 sm:h-72 lg:h-80 overflow-hidden relative">
            <img src={mainImage} alt="" className="w-full h-full object-cover" style={{ filter: "saturate(1.2) contrast(1.05)" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        ) : (
          <div className={`h-56 sm:h-72 lg:h-80 overflow-hidden relative bg-gradient-to-br ${theme.gradient}`}>
            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative">
                <div className="absolute rounded-full opacity-20 blur-3xl" style={{ background: theme.accent, width: 200, height: 200, left: "50%", top: "50%", transform: "translate(-50%, -50%)" }} />
                <CategoryIcon className="h-24 w-24 text-white/15" strokeWidth={0.8} />
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          </div>
        )}

        {/* Back button overlay */}
        <div className="absolute top-20 left-4 sm:left-6 z-10">
          <Button variant="outline" size="sm" onClick={() => navigate(-1)} className="bg-background/60 backdrop-blur-md border-border/30 hover:bg-background/80">
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-16 relative z-10 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Header Card */}
          <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-card">
            <div className="flex flex-col sm:flex-row sm:items-start gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/90 text-primary-foreground text-[10px] uppercase font-display tracking-wider">{realCategory}</Badge>
                  {isAvailable ? (
                    <Badge className="bg-green-500/20 text-green-400 text-[10px] border border-green-500/30">
                      <Zap className="h-3 w-3 mr-1" /> Disponível
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-[10px]">Vendida</Badge>
                  )}
                  {origin && <Badge variant="outline" className="text-[10px] border-border/30 text-muted-foreground">{origin}</Badge>}
                </div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground">
                  CONTA BARATA #{shortId}
                </h1>
                {publishedDate && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" /> Publicada em {publishedDate}
                  </p>
                )}
              </div>
              <div className="sm:text-right space-y-3">
                <p className="text-3xl font-bold text-primary font-display">R$ {price.toFixed(2)}</p>
                {isAvailable && (
                  <Button
                    size="lg"
                    className="bg-gradient-gold text-primary-foreground font-display w-full sm:w-auto gap-2 shadow-gold"
                    onClick={() => {
                      if (!user) { toast.error("Faça login para comprar"); navigate("/auth"); return; }
                      navigate("/loja");
                      toast.info("Use a loja para finalizar a compra.");
                    }}
                  >
                    <ShoppingCart className="h-5 w-5" /> Comprar Agora
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Game-specific Inventory */}
          <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-card">
            <div className="flex items-center gap-2 mb-5">
              <Eye className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg text-foreground">Detalhes da Conta</h2>
            </div>
            <GameInventory data={d} cat={realCategory} />
          </div>

          {/* Image Gallery */}
          {allImages.length > 0 && (
            <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 mb-5">
                <Gamepad2 className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg text-foreground">Inventário Visual</h2>
              </div>
              <div className="space-y-4">
                {allImages.map((img, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-xs font-display text-muted-foreground uppercase tracking-wider">{img.label}</p>
                    <div className="rounded-xl overflow-hidden border border-border/20 bg-muted/10">
                      <img src={img.url} alt={img.label} className="w-full h-auto object-contain max-h-[400px]" loading="lazy" style={{ filter: "saturate(1.1) contrast(1.05)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seller / Trust Info */}
          {sellerName && (
            <div className="rounded-2xl border border-border/40 bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg text-foreground">Informações de Confiança</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat icon={Users} label="Vendedor" value={sellerName} />
                {soldCount !== undefined && <Stat icon={ShoppingCart} label="Vendas" value={soldCount.toLocaleString()} />}
                {positiveFeedback > 0 && <Stat icon={Star} label="Avaliações +" value={positiveFeedback.toLocaleString()} highlight />}
                {negativeFeedback > 0 && <Stat icon={Shield} label="Avaliações -" value={negativeFeedback.toLocaleString()} />}
              </div>
            </div>
          )}

        </motion.div>
      </div>

      <Footer />
    </div>
  );
};

export default AccountPreview;
