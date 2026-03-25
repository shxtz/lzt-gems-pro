import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* ── Tier / Rarity Styles ──────────────────────────────── */

const GENSHIN_TIERS: Record<number, { key: string; name: string; color: number[]; bgColor: number[] }> = {
  5: { key: "5star", name: "5★ Lendário", color: [198, 169, 110], bgColor: [80, 60, 30] },
  4: { key: "4star", name: "4★ Épico", color: [160, 100, 210], bgColor: [55, 35, 75] },
  3: { key: "3star", name: "3★ Raro", color: [80, 140, 210], bgColor: [30, 50, 80] },
};

const HONKAI_TIERS: Record<number, { key: string; name: string; color: number[]; bgColor: number[] }> = {
  5: { key: "5star", name: "5★ Lendário", color: [200, 170, 80], bgColor: [80, 65, 30] },
  4: { key: "4star", name: "4★ Épico", color: [140, 100, 220], bgColor: [50, 35, 80] },
};

const LOL_TIER = { key: "champion", name: "Campeão", color: [200, 155, 60], bgColor: [70, 55, 25] };

const FORTNITE_RARITIES: Record<string, { key: string; name: string; color: number[]; bgColor: number[] }> = {
  legendary: { key: "legendary", name: "Lendário", color: [234, 152, 44], bgColor: [90, 60, 20] },
  epic: { key: "epic", name: "Épico", color: [170, 80, 220], bgColor: [60, 30, 85] },
  rare: { key: "rare", name: "Raro", color: [70, 140, 220], bgColor: [25, 50, 85] },
  uncommon: { key: "uncommon", name: "Incomum", color: [90, 190, 60], bgColor: [30, 70, 25] },
  common: { key: "common", name: "Comum", color: [160, 160, 160], bgColor: [60, 60, 60] },
};

const ZZZ_TIERS: Record<string, { key: string; name: string; color: number[]; bgColor: number[] }> = {
  S: { key: "S", name: "S-Rank", color: [245, 212, 66], bgColor: [85, 75, 25] },
  A: { key: "A", name: "A-Rank", color: [160, 100, 220], bgColor: [55, 35, 80] },
  B: { key: "B", name: "B-Rank", color: [80, 160, 220], bgColor: [30, 55, 80] },
};

const MINECRAFT_TIER = { key: "item", name: "Item", color: [93, 140, 62], bgColor: [35, 55, 25] };

/* ── Caches ─────────────────────────────────────────────── */

let genshinCharCache: Map<string, any> | null = null;
let lolChampionCache: Map<string, any> | null = null;
let ddragonVersion: string | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 2 * 60 * 60 * 1000;

async function ensureGenshinCache() {
  if (genshinCharCache && Date.now() - cacheTimestamp < CACHE_TTL) return;
  try {
    const res = await fetch("https://genshin.jmp.blue/characters/all?lang=pt");
    if (res.ok) {
      const chars: any[] = await res.json();
      genshinCharCache = new Map();
      for (const c of chars) {
        if (c.name) {
          const slug = c.id || c.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
          genshinCharCache.set(c.name.toLowerCase(), { ...c, slug });
          genshinCharCache.set(slug, { ...c, slug });
        }
      }
    }
  } catch (e) {
    console.error("Failed to load Genshin cache:", e);
    genshinCharCache = new Map();
  }
  cacheTimestamp = Date.now();
}

let lolChampionByKey: Map<number, { id: string; name: string; key: string; tags: string[] }> | null = null;

async function ensureLoLCache() {
  if (lolChampionCache && lolChampionByKey && ddragonVersion) return;
  try {
    const vRes = await fetch("https://ddragon.leagueoflegends.com/api/versions.json");
    const versions = await vRes.json();
    ddragonVersion = versions[0];
    const cRes = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/pt_BR/champion.json`);
    const champData = await cRes.json();
    lolChampionCache = new Map();
    lolChampionByKey = new Map();
    for (const [id, champ] of Object.entries(champData.data as Record<string, any>)) {
      const entry = { id, name: champ.name, key: champ.key, tags: champ.tags || [] };
      lolChampionCache.set(champ.name.toLowerCase(), entry);
      lolChampionCache.set(id.toLowerCase(), entry);
      lolChampionByKey.set(Number(champ.key), entry);
    }
  } catch (e) {
    console.error("Failed to load LoL cache:", e);
    lolChampionCache = new Map();
    lolChampionByKey = new Map();
    ddragonVersion = "14.24.1";
  }
}

/* ── Game Handlers ──────────────────────────────────────── */

function detectGame(data: any, categoryName: string): string {
  const cat = categoryName.toLowerCase();
  if (cat.includes("genshin")) return "genshin";
  if (cat.includes("honkai") || cat.includes("star rail")) return "honkai";
  if (cat.includes("lol") || cat.includes("league")) return "lol";
  if (cat.includes("fortnite")) return "fortnite";
  if (cat.includes("minecraft")) return "minecraft";
  if (cat.includes("zenless") || cat.includes("zzz")) return "zzz";
  if (data?.genshinCharacters) return "genshin";
  if (data?.honkaiCharacters) return "honkai";
  if (data?.riot_lol_level || data?.riot_lol_rank) return "lol";
  if (data?.fortnite_vbucks !== undefined) return "fortnite";
  if (data?.minecraft_java !== undefined || data?.minecraft_bedrock !== undefined) return "minecraft";
  return "unknown";
}

async function handleGenshin(data: any) {
  await ensureGenshinCache();
  const chars: any[] = data?.genshinCharacters || [];
  const items: any[] = [];
  for (const c of chars) {
    const name = c.name || "";
    const rarity = c.rarity || c.stars || 4;
    const tier = GENSHIN_TIERS[rarity] || GENSHIN_TIERS[4];
    const cached = genshinCharCache?.get(name.toLowerCase());
    const slug = cached?.slug || name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const icon = `https://genshin.jmp.blue/characters/${slug}/icon-big`;
    items.push({
      id: slug, name: cached?.name || name, icon, type: "character", rarity, tier,
      element: c.element || cached?.vision || null, weapon: c.weapon || cached?.weapon || null,
      constellation: c.constellation || c.cons || 0,
    });
  }
  items.sort((a, b) => (b.rarity || 0) - (a.rarity || 0));
  const tabs = [];
  if (items.length > 0) tabs.push({ key: "characters", label: "Personagens", count: items.length });
  return { game: "genshin", items, tabs, theme: { primary: [200, 169, 110], accent: [198, 150, 80], bg: [40, 35, 30] } };
}

async function handleHonkai(data: any) {
  const chars: any[] = data?.honkaiCharacters || [];
  const items = chars.map((c: any) => {
    const rarity = c.rarity || c.stars || 4;
    return {
      id: (c.name || "").toLowerCase().replace(/\s+/g, "-"), name: c.name || "", icon: null,
      type: "character", rarity, tier: HONKAI_TIERS[rarity] || HONKAI_TIERS[4],
      path: c.path || c.trail || null, element: c.element || null, eidolon: c.eidolon || c.eidolons || 0,
    };
  });
  items.sort((a, b) => (b.rarity || 0) - (a.rarity || 0));
  const tabs = [];
  if (items.length > 0) tabs.push({ key: "characters", label: "Personagens", count: items.length });
  return { game: "honkai", items, tabs, theme: { primary: [108, 92, 231], accent: [130, 110, 255], bg: [25, 20, 45] } };
}

async function handleLoL(data: any) {
  await ensureLoLCache();
  const champNames: string[] = data?.lolChampions || data?.riot_lol_champions || [];
  const items = champNames.map((name: string) => {
    const cached = lolChampionCache?.get(name.toLowerCase());
    const champKey = cached?.key || name;
    return {
      id: champKey, name: cached?.name || name,
      icon: `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${champKey}.png`,
      type: "champion", rarity: 0, tier: LOL_TIER, tags: cached?.tags || [],
    };
  });
  const tabs = [];
  if (items.length > 0) tabs.push({ key: "champions", label: "Campeões", count: items.length });
  return { game: "lol", items, tabs, theme: { primary: [200, 155, 60], accent: [30, 60, 100], bg: [10, 20, 40] } };
}

function handleFortnite(data: any) {
  const cosmetics: any[] = data?.fortniteCosmetics || data?.fortnite_locker || [];
  const items = cosmetics.map((c: any) => {
    const rarity = (c.rarity || "common").toLowerCase();
    return {
      id: c.id || (c.name || "").toLowerCase().replace(/\s+/g, "-"), name: c.name || "Cosmético",
      icon: c.icon || c.images?.icon || null, type: c.type || "outfit", rarity,
      tier: FORTNITE_RARITIES[rarity] || FORTNITE_RARITIES.common,
    };
  });
  const tabs = [];
  if (items.length > 0) tabs.push({ key: "all", label: "Itens", count: items.length });
  return { game: "fortnite", items, tabs, theme: { primary: [157, 77, 187], accent: [47, 123, 199], bg: [20, 15, 35] } };
}

function handleMinecraft(data: any) {
  const items: any[] = [];
  // Editions
  if (data?.minecraft_java) items.push({ id: "java", name: "Java Edition", icon: "https://static.wikia.nocookie.net/minecraft_gamepedia/images/4/44/Java_Edition.png", type: "edition", rarity: 0, tier: MINECRAFT_TIER });
  if (data?.minecraft_bedrock) items.push({ id: "bedrock", name: "Bedrock Edition", icon: "https://static.wikia.nocookie.net/minecraft_gamepedia/images/7/73/Bedrock_Edition.png", type: "edition", rarity: 0, tier: MINECRAFT_TIER });
  // Capes
  const capes: any[] = data?.minecraft_capes || [];
  for (const cape of capes) {
    const capeName = typeof cape === "string" ? cape : (cape?.name || cape?.title || "Capa");
    items.push({ id: capeName.toLowerCase().replace(/\s+/g, "-"), name: capeName, icon: typeof cape === "object" ? (cape?.icon || cape?.url || null) : null, type: "cape", rarity: 1, tier: { ...MINECRAFT_TIER, name: "Capa" } });
  }
  // Skin preview
  const mcId = data?.minecraft_id;
  const mcNick = data?.minecraft_nickname;
  if (mcId) {
    items.push({ id: "skin", name: mcNick || "Skin", icon: `https://crafatar.com/renders/body/${mcId}?overlay&scale=4`, type: "skin", rarity: 0, tier: MINECRAFT_TIER });
  }
  return { game: "minecraft", items, tabs: items.length > 0 ? [{ key: "all", label: "Itens", count: items.length }] : [], theme: { primary: [93, 140, 62], accent: [120, 170, 80], bg: [30, 40, 25] } };
}

function handleZZZ(data: any) {
  const chars: any[] = data?.zzzCharacters || data?.zenlessCharacters || [];
  const items = chars.map((c: any) => {
    const rank = c.rank || c.rarity || "A";
    const rankKey = typeof rank === "number" ? (rank >= 5 ? "S" : rank >= 4 ? "A" : "B") : String(rank).toUpperCase();
    return {
      id: (c.name || "").toLowerCase().replace(/\s+/g, "-"), name: c.name || "Agente",
      icon: c.icon || null, type: "character", rarity: rankKey, tier: ZZZ_TIERS[rankKey] || ZZZ_TIERS.A,
    };
  });
  return { game: "zzz", items, tabs: items.length > 0 ? [{ key: "characters", label: "Agentes", count: items.length }] : [], theme: { primary: [245, 212, 66], accent: [60, 200, 200], bg: [15, 15, 20] } };
}

/* ── Extract gallery ────────────────────────────────────── */

function extractGallery(data: any): { label: string; url: string }[] {
  const links = data?.imagePreviewLinks || data?.image_preview_links;
  if (!links) return [];
  const LABELS: Record<string, string> = {
    weapons: "Armas", agents: "Agentes", buddies: "Buddies", skins: "Skins",
    pickaxes: "Picaretas", emotes: "Emotes", gliders: "Planadores",
    characters: "Personagens", champions: "Campeões", games: "Jogos", inventory: "Inventário", profile: "Perfil",
  };
  const gallery: { label: string; url: string }[] = [];
  const seen = new Set<string>();
  for (const source of [links.download, links.direct]) {
    if (!source || typeof source !== "object") continue;
    for (const [key, url] of Object.entries(source)) {
      if (typeof url !== "string" || seen.has(key)) continue;
      seen.add(key);
      gallery.push({ label: LABELS[key] || key, url: url as string });
    }
  }
  return gallery;
}

/* ── Main ───────────────────────────────────────────────── */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const accountId = url.searchParams.get("account_id");
    const gameHint = url.searchParams.get("game") || "";
    if (!accountId) return new Response(JSON.stringify({ error: "account_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: account } = await supabase.from("lzt_accounts").select("data, category_id").eq("id", accountId).maybeSingle();
    if (!account) return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const lztData = account.data as any;
    let categoryName = gameHint;
    if (!categoryName && account.category_id) {
      const { data: cat } = await supabase.from("lzt_categories").select("name").eq("id", account.category_id).maybeSingle();
      categoryName = cat?.name || "";
    }

    const game = detectGame(lztData, categoryName);
    let result: any;
    switch (game) {
      case "genshin": result = await handleGenshin(lztData); break;
      case "honkai": result = await handleHonkai(lztData); break;
      case "lol": result = await handleLoL(lztData); break;
      case "fortnite": result = handleFortnite(lztData); break;
      case "minecraft": result = handleMinecraft(lztData); break;
      case "zzz": result = handleZZZ(lztData); break;
      default: result = { game: "unknown", items: [], tabs: [], theme: { primary: [180, 140, 80], accent: [200, 160, 100], bg: [30, 25, 20] } };
    }
    result.gallery = extractGallery(lztData);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=600" } });
  } catch (err: any) {
    console.error("game-inventory error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
