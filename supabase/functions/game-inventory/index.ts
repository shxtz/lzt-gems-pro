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

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function collectNumericIds(raw: any): number[] {
  const values = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? Object.values(raw)
      : typeof raw === "string"
        ? raw.split(/[^\d]+/)
        : [];

  return Array.from(new Set(
    values
      .map((value) => (typeof value === "number" ? value : Number(value)))
      .filter((value) => Number.isFinite(value) && value > 0)
  ));
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getKey(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseRankValue(value: unknown, fallback = 4) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function parseZZZRank(entry: any): keyof typeof ZZZ_TIERS {
  const iconText = `${entry?.rarityIcon || entry?.rankIcon || entry?.weapon?.rarityIcon || ""}`.toLowerCase();
  if (iconText.includes("rarity-s") || iconText.includes("rank-s")) return "S";
  if (iconText.includes("rarity-a") || iconText.includes("rank-a")) return "A";
  if (iconText.includes("rarity-b") || iconText.includes("rank-b")) return "B";

  const rank = entry?.rank ?? entry?.rarity ?? entry?.star;
  if (typeof rank === "string") {
    const normalized = rank.toUpperCase();
    if (normalized === "S" || normalized === "A" || normalized === "B") return normalized as keyof typeof ZZZ_TIERS;
  }

  const numericRank = parseRankValue(rank, 1);
  if (numericRank >= 2) return "S";
  if (numericRank >= 1) return "A";
  return "B";
}

function toDataUrl(base64: string | null | undefined) {
  if (!base64 || typeof base64 !== "string") return null;
  return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
}

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
    const rarity = parseRankValue(c.rarity || c.stars, 4);
    const tier = GENSHIN_TIERS[rarity] || GENSHIN_TIERS[4];
    const cached = genshinCharCache?.get(name.toLowerCase());
    const slug = cached?.slug || slugify(name);
    const icon = c.image || c.icon || `https://genshin.jmp.blue/characters/${slug}/icon-big`;
    items.push({
      id: slug, name: cached?.name || name, icon, type: "character", rarity, tier,
      element: c.element || cached?.vision || null, weapon: c.weapon || cached?.weapon || null,
      constellation: c.actived_constellation_num || c.constellation || c.cons || 0,
    });
  }
  const weapons = uniqueBy(
    chars.flatMap((character: any) => {
      const weapon = character?.weapon;
      if (!weapon?.name) return [];
      const rarity = parseRankValue(weapon.rarity || weapon.stars, 3);
      return [{
        id: String(weapon.id || `${slugify(weapon.name)}-${rarity}`),
        name: weapon.name,
        icon: weapon.icon || null,
        type: "weapon",
        rarity,
        tier: GENSHIN_TIERS[rarity] || GENSHIN_TIERS[3],
      }];
    }),
    (weapon) => weapon.id,
  ).sort((a, b) => (b.rarity || 0) - (a.rarity || 0));
  items.sort((a, b) => (b.rarity || 0) - (a.rarity || 0));
  const tabs = [];
  if (items.length > 0) tabs.push({ key: "characters", label: "Personagens", count: items.length });
  if (weapons.length > 0) tabs.push({ key: "weapons", label: "Armas", count: weapons.length });
  return { game: "genshin", items, weapons, collections: { characters: items, weapons }, tabs, theme: { primary: [200, 169, 110], accent: [198, 150, 80], bg: [40, 35, 30] } };
}

async function handleHonkai(data: any) {
  const chars: any[] = data?.honkaiCharacters || [];
  const items = chars.map((c: any) => {
    const rarity = parseRankValue(c.rarity || c.stars || c.base_type, 4);
    return {
      id: slugify(c.name || "character"), name: c.name || "", icon: c.icon || c.avatar || null,
      type: "character", rarity, tier: HONKAI_TIERS[rarity] || HONKAI_TIERS[4],
      path: c.path || c.trail || null, element: c.element || null, eidolon: c.rank || c.eidolon || c.eidolons || 0,
    };
  });
  const lightcones = uniqueBy(
    chars.flatMap((character: any) => {
      const lightcone = character?.equip || character?.lightcone || character?.weapon;
      if (!lightcone?.name) return [];
      const rarity = parseRankValue(lightcone.rarity || lightcone.stars || lightcone.base_type, 4);
      return [{
        id: String(lightcone.id || `${slugify(lightcone.name)}-${rarity}`),
        name: lightcone.name,
        icon: lightcone.icon || null,
        type: "lightcone",
        rarity,
        tier: HONKAI_TIERS[rarity] || HONKAI_TIERS[4],
      }];
    }),
    (lightcone) => lightcone.id,
  ).sort((a, b) => (b.rarity || 0) - (a.rarity || 0));
  items.sort((a, b) => (b.rarity || 0) - (a.rarity || 0));
  const tabs = [];
  if (items.length > 0) tabs.push({ key: "characters", label: "Personagens", count: items.length });
  if (lightcones.length > 0) tabs.push({ key: "lightcones", label: "Light Cones", count: lightcones.length });
  return { game: "honkai", items, lightcones, collections: { characters: items, lightcones }, tabs, theme: { primary: [108, 92, 231], accent: [130, 110, 255], bg: [25, 20, 45] } };
}

async function handleLoL(data: any) {
  await ensureLoLCache();

  const rawSkins = data?.lolInventory?.Skin ?? data?.lolInventory?.skins ?? data?.lolInventory?.skin ?? [];
  const skinIds = collectNumericIds(rawSkins);

  const rawChampions = data?.lolInventory?.Champion ?? data?.lolInventory?.champions ?? data?.lolInventory?.champion ?? [];
  const championIds = collectNumericIds(rawChampions);

  const items: any[] = [];
  const seenChampions = new Set<number>();

  for (const skinId of skinIds) {
    const championKey = Math.floor(skinId / 1000);
    const skinNum = skinId % 1000;
    const champData = lolChampionByKey?.get(championKey);
    const champId = champData?.id || `Champion${championKey}`;
    const champName = champData?.name || champId;

    seenChampions.add(championKey);

    if (skinNum === 0) continue;

    items.push({
      id: `skin-${skinId}`,
      name: `${champName} #${skinNum}`,
      icon: `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champId}_${skinNum}.jpg`,
      splash: `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champId}_${skinNum}.jpg`,
      type: "skin",
      rarity: 1,
      tier: { ...LOL_TIER, name: "Skin" },
      champion: champName,
    });
  }

  for (const championKey of championIds) {
    if (seenChampions.has(championKey)) continue;
    const champData = lolChampionByKey?.get(championKey);
    const champId = champData?.id || `Champion${championKey}`;
    const champName = champData?.name || champId;

    items.push({
      id: `champ-${championKey}`,
      name: champName,
      icon: `https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/img/champion/${champId}.png`,
      splash: `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champId}_0.jpg`,
      type: "champion",
      rarity: 0,
      tier: LOL_TIER,
      tags: champData?.tags || [],
    });
  }

  const skins = items.filter((i) => i.type === "skin");
  const champions = items.filter((i) => i.type === "champion");
  const stats = {
    level: data?.riot_lol_level,
    rank: data?.riot_lol_rank,
    region: data?.riot_lol_region,
    blueEssence: data?.riot_lol_wallet_blue,
    orangeEssence: data?.riot_lol_wallet_orange,
    rp: data?.riot_lol_wallet_riot,
    mythicEssence: data?.riot_lol_wallet_mythic,
    skinCount: data?.riot_lol_skin_count || skins.length,
    championCount: data?.riot_lol_champion_count || championIds.length || champions.length,
  };

  const tabs = [];
  if (skins.length > 0) tabs.push({ key: "skins", label: "Skins", count: skins.length });
  if (champions.length > 0) tabs.push({ key: "champions", label: "Campeões", count: champions.length });

  return { game: "lol", items, skins, champions, stats, tabs, theme: { primary: [200, 155, 60], accent: [30, 60, 100], bg: [10, 20, 40] } };
}

function handleFortnite(data: any) {
  const rawCosmetics = data?.fortniteCosmetics || data?.fortnite_locker || data?.fortniteLocker || [];
  const cosmetics: any[] = Array.isArray(rawCosmetics)
    ? rawCosmetics
    : rawCosmetics && typeof rawCosmetics === "object"
      ? Object.values(rawCosmetics)
      : [];
  const items = cosmetics.map((c: any) => {
    const rarity = (c.rarity || "common").toLowerCase();
    const type = String(c.type || c.backendType || c.gameplayType || "outfit").toLowerCase();
    return {
      id: c.id || (c.name || "").toLowerCase().replace(/\s+/g, "-"), name: c.name || "Cosmético",
      icon: c.icon || c.images?.icon || c.displayAssets?.[0]?.url || c.smallIcon || null, type, rarity,
      tier: FORTNITE_RARITIES[rarity] || FORTNITE_RARITIES.common,
    };
  });
  const collections = {
    outfits: items.filter((item) => item.type.includes("outfit") || item.type.includes("skin")),
    pickaxes: items.filter((item) => item.type.includes("pickaxe")),
    emotes: items.filter((item) => item.type.includes("emote")),
    gliders: items.filter((item) => item.type.includes("glider")),
  };
  const tabs = [];
  if (collections.outfits.length > 0) tabs.push({ key: "outfits", label: "Skins", count: collections.outfits.length });
  if (collections.pickaxes.length > 0) tabs.push({ key: "pickaxes", label: "Picaretas", count: collections.pickaxes.length });
  if (collections.emotes.length > 0) tabs.push({ key: "emotes", label: "Emotes", count: collections.emotes.length });
  if (collections.gliders.length > 0) tabs.push({ key: "gliders", label: "Planadores", count: collections.gliders.length });
  if (tabs.length === 0 && items.length > 0) tabs.push({ key: "all", label: "Itens", count: items.length });
  return { game: "fortnite", items, collections, tabs, theme: { primary: [157, 77, 187], accent: [47, 123, 199], bg: [20, 15, 35] } };
}

function handleMinecraft(data: any) {
  const editions: any[] = [];
  if (data?.minecraft_java) editions.push({ id: "java", name: "Java Edition", icon: "https://static.wikia.nocookie.net/minecraft_gamepedia/images/4/44/Java_Edition.png", type: "edition", rarity: 0, tier: MINECRAFT_TIER });
  if (data?.minecraft_bedrock) editions.push({ id: "bedrock", name: "Bedrock Edition", icon: "https://static.wikia.nocookie.net/minecraft_gamepedia/images/7/73/Bedrock_Edition.png", type: "edition", rarity: 0, tier: MINECRAFT_TIER });
  const capes: any[] = data?.minecraft_capes || [];
  const capeItems = capes.map((cape: any, index: number) => {
    const capeName = typeof cape === "string" ? cape : (cape?.name || cape?.title || "Capa");
    return { id: `${slugify(capeName)}-${index}`, name: capeName, icon: typeof cape === "object" ? (cape?.rendered || cape?.icon || cape?.url || toDataUrl(cape?.data)) : null, type: "cape", rarity: 1, tier: { ...MINECRAFT_TIER, key: "cape", name: "Capa" } };
  });
  const mcId = data?.minecraft_id;
  const mcNick = data?.minecraft_nickname;
  const skinItems: any[] = [];
  if (typeof data?.minecraft_skin === "string" && data.minecraft_skin.length > 100) {
    skinItems.push({ id: "skin-base64", name: mcNick || "Skin", icon: toDataUrl(data.minecraft_skin), type: "skin", rarity: 0, tier: { ...MINECRAFT_TIER, key: "skin", name: "Skin" } });
  }
  if (mcId) {
    skinItems.push({ id: "skin-render", name: mcNick || "Skin", icon: `https://crafatar.com/renders/body/${mcId}?overlay&scale=8`, type: "skin", rarity: 0, tier: { ...MINECRAFT_TIER, key: "skin", name: "Skin" } });
  } else if (mcNick) {
    skinItems.push({ id: "skin-render", name: mcNick, icon: `https://minotar.net/armor/body/${mcNick}/300.png`, type: "skin", rarity: 0, tier: { ...MINECRAFT_TIER, key: "skin", name: "Skin" } });
  }
  const collections = { skins: uniqueBy(skinItems, (item) => item.id), capes: capeItems, editions };
  const items = [...collections.skins, ...collections.capes, ...collections.editions];
  const tabs = [];
  if (collections.skins.length > 0) tabs.push({ key: "skins", label: "Skin", count: collections.skins.length });
  if (collections.capes.length > 0) tabs.push({ key: "capes", label: "Capas", count: collections.capes.length });
  if (collections.editions.length > 0) tabs.push({ key: "editions", label: "Edições", count: collections.editions.length });
  return { game: "minecraft", items, collections, tabs, theme: { primary: [93, 140, 62], accent: [120, 170, 80], bg: [30, 40, 25] } };
}

function handleZZZ(data: any) {
  const chars: any[] = data?.zzzCharacters || data?.zenlessCharacters || [];
  const items = chars.map((c: any) => {
    const rankKey = parseZZZRank(c);
    return {
      id: slugify(c.name || c.name_mi18n || "agente"), name: c.name || c.name_mi18n || "Agente",
      icon: c.role_square_url || c.skin_list?.find((skin: any) => skin?.unlocked)?.skin_square_url || c.role_vertical_painting_url || c.icon || null, type: "character", rarity: rankKey, tier: ZZZ_TIERS[rankKey] || ZZZ_TIERS.A,
    };
  });
  const weapons = uniqueBy(
    chars.flatMap((agent: any) => {
      const weapon = agent?.weapon;
      if (!weapon?.name) return [];
      const rankKey = parseZZZRank(weapon);
      return [{
        id: String(weapon.id || slugify(weapon.name)),
        name: weapon.name,
        icon: weapon.icon || null,
        type: "weapon",
        rarity: rankKey,
        tier: ZZZ_TIERS[rankKey] || ZZZ_TIERS.A,
      }];
    }),
    (weapon) => weapon.id,
  );
  return { game: "zzz", items, collections: { characters: items, weapons }, tabs: [...(items.length > 0 ? [{ key: "characters", label: "Agentes", count: items.length }] : []), ...(weapons.length > 0 ? [{ key: "weapons", label: "W-Engines", count: weapons.length }] : [])], theme: { primary: [245, 212, 66], accent: [60, 200, 200], bg: [15, 15, 20] } };
}

/* ── Extract gallery ────────────────────────────────────── */

function extractGallery(data: any): { label: string; url: string }[] {
  const links = data?.imagePreviewLinks || data?.image_preview_links;
  if (!links) return [];
  if (typeof links === "string") return [{ label: "Preview", url: links }];
  if (Array.isArray(links)) {
    return links.filter((url): url is string => typeof url === "string" && url.length > 0).map((url, index) => ({ label: `Preview ${index + 1}`, url }));
  }
  const LABELS: Record<string, string> = {
    weapons: "Armas", agents: "Agentes", buddies: "Buddies", skins: "Skins",
    pickaxes: "Picaretas", emotes: "Emotes", gliders: "Planadores",
    characters: "Personagens", champions: "Campeões", games: "Jogos", inventory: "Inventário", profile: "Perfil", genshin: "Genshin", honkai: "Honkai", zenless: "Zenless", zzz: "Zenless",
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
