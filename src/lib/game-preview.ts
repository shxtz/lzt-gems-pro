/**
 * Unified game preview item extraction for Shop cards and AccountPreview grids.
 * Provides consistent 3x3 grid previews for ALL supported games.
 */

export interface GamePreviewItem {
  id: string;
  imageUrl: string;
  name: string;
  tier: { key: string; tile: [number, number, number]; outline: [number, number, number] };
  tierIcon?: string | null;
}

/* ── Tier Palettes ─────────────────────────────────────── */

const GENSHIN_5 = { key: "5star", tile: [80, 60, 30] as [number, number, number], outline: [198, 169, 110] as [number, number, number] };
const GENSHIN_4 = { key: "4star", tile: [55, 35, 75] as [number, number, number], outline: [160, 100, 210] as [number, number, number] };

const HONKAI_5 = { key: "5star", tile: [80, 65, 30] as [number, number, number], outline: [200, 170, 80] as [number, number, number] };
const HONKAI_4 = { key: "4star", tile: [50, 35, 80] as [number, number, number], outline: [140, 100, 220] as [number, number, number] };

const ZZZ_S = { key: "S", tile: [85, 75, 25] as [number, number, number], outline: [245, 212, 66] as [number, number, number] };
const ZZZ_A = { key: "A", tile: [55, 35, 80] as [number, number, number], outline: [160, 100, 220] as [number, number, number] };

const FN_LEGENDARY = { key: "legendary", tile: [90, 60, 20] as [number, number, number], outline: [234, 152, 44] as [number, number, number] };
const FN_EPIC = { key: "epic", tile: [60, 30, 85] as [number, number, number], outline: [170, 80, 220] as [number, number, number] };
const FN_RARE = { key: "rare", tile: [25, 50, 85] as [number, number, number], outline: [70, 140, 220] as [number, number, number] };
const FN_UNCOMMON = { key: "uncommon", tile: [30, 70, 25] as [number, number, number], outline: [90, 190, 60] as [number, number, number] };
const FN_COMMON = { key: "common", tile: [60, 60, 60] as [number, number, number], outline: [160, 160, 160] as [number, number, number] };

const MC_TIER = { key: "mc", tile: [35, 55, 25] as [number, number, number], outline: [93, 140, 62] as [number, number, number] };

const FORTNITE_RARITY_MAP: Record<string, typeof FN_LEGENDARY> = {
  legendary: FN_LEGENDARY,
  epic: FN_EPIC,
  rare: FN_RARE,
  superrare: FN_RARE,
  uncommon: FN_UNCOMMON,
  common: FN_COMMON,
};

function toDataUrl(base64: string | null | undefined): string | null {
  if (!base64 || typeof base64 !== "string") return null;
  return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
}

function flattenCollection(input: any): any[] {
  if (!input) return [];
  if (Array.isArray(input)) return input.flatMap(flattenCollection);
  if (typeof input !== "object") return [];

  const looksLikeItem =
    "id" in input ||
    "name" in input ||
    "type" in input ||
    "rarity" in input ||
    "images" in input ||
    "icon" in input ||
    "displayAssets" in input;

  if (looksLikeItem) return [input];
  return Object.values(input).flatMap(flattenCollection);
}

function getFortniteCosmetics(data: any): any[] {
  // Check structured arrays first (LZT format)
  const skins = data?.fortniteSkins || data?.fortniteOutfit || [];
  const dances = data?.fortniteDance || [];
  const pickaxes = data?.fortnitePickaxe || [];
  const gliders = data?.fortniteGliders || [];
  if (skins.length > 0 || dances.length > 0 || pickaxes.length > 0 || gliders.length > 0) {
    return [
      ...skins.map((s: any) => ({ ...s, type: s.type || "outfit" })),
      ...pickaxes.map((s: any) => ({ ...s, type: s.type || "pickaxe" })),
      ...gliders.map((s: any) => ({ ...s, type: s.type || "glider" })),
      ...dances.map((s: any) => ({ ...s, type: s.type || "emote" })),
    ];
  }
  // Fallback to generic fields
  return flattenCollection(
    data?.fortniteCosmetics ||
      data?.fortnite_cosmetics ||
      data?.fortnite_locker ||
      data?.fortniteLocker ||
      data?.locker ||
      data?.cosmetics ||
      data?.inventory?.fortnite ||
      data?.inventory?.cosmetics,
  );
}

function getMinecraftCapes(data: any): any[] {
  const raw = data?.minecraft_capes || data?.minecraftCapes || data?.capes || [];
  return Array.isArray(raw) ? raw.flatMap((entry) => (Array.isArray(entry) ? entry : [entry])) : [];
}

function getFortniteType(entry: any): string {
  const rawType = String(
    entry?.type?.value ||
      entry?.type ||
      entry?.backendType ||
      entry?.gameplayType ||
      entry?.itemType ||
      entry?.category ||
      entry?.slot ||
      "outfit",
  ).toLowerCase();

  if (rawType.includes("outfit") || rawType.includes("character") || rawType.includes("skin") || rawType.includes("athenacharacter")) return "outfit";
  if (rawType.includes("pickaxe") || rawType.includes("harvesting")) return "pickaxe";
  if (rawType.includes("glider") || rawType.includes("umbrella")) return "glider";
  if (rawType.includes("emote") || rawType.includes("dance") || rawType.includes("emoji")) return "emote";
  if (rawType.includes("backpack") || rawType.includes("back bling")) return "backbling";
  if (rawType.includes("wrap")) return "wrap";
  return rawType;
}

function getFortniteIcon(entry: any): string {
  // Try explicit icon fields first
  const explicit =
    entry?.icon ||
    entry?.images?.icon ||
    entry?.images?.smallIcon ||
    entry?.images?.featured ||
    entry?.displayAssets?.[0]?.url ||
    entry?.smallIcon ||
    entry?.image ||
    entry?.thumbnail ||
    entry?.offerImage;
  if (explicit) return explicit;

  // Build URL from LZT cosmetic ID (e.g. "CID_515_Athena_Commando_M_BarbequeLarry")
  const cosmeticId = entry?.id;
  if (typeof cosmeticId === "string" && cosmeticId.length > 3) {
    // fortnite-api.com expects the original case-sensitive ID
    return `https://fortnite-api.com/images/cosmetics/br/${cosmeticId}/icon.png`;
  }

  // Try building from name as last resort
  const name = entry?.name;
  if (typeof name === "string" && name.length > 1) {
    return `https://fortnite-api.com/images/cosmetics/br/search?name=${encodeURIComponent(name)}`;
  }
  return "";
}

/* ── Genshin Impact ────────────────────────────────────── */

export function getGenshinPreviewItems(data: any, limit = 9): GamePreviewItem[] {
  const chars: any[] = data?.genshinCharacters || [];
  if (chars.length === 0) return [];

  const sorted = [...chars].sort((a, b) => (b.rarity || 0) - (a.rarity || 0));

  return sorted.slice(0, limit).map((c, i) => {
    const rarity = c.rarity || 4;
    const name = c.name || "Personagem";
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    return {
      id: `gi-${slug}-${i}`,
      imageUrl: c.image || c.icon || `https://genshin.jmp.blue/characters/${slug}/icon-big`,
      name,
      tier: rarity >= 5 ? GENSHIN_5 : GENSHIN_4,
    };
  });
}

/* ── Honkai: Star Rail ─────────────────────────────────── */

export function getHonkaiPreviewItems(data: any, limit = 9): GamePreviewItem[] {
  const chars: any[] = data?.honkaiCharacters || [];
  if (chars.length === 0) return [];

  const sorted = [...chars].sort((a, b) => (b.rarity || 0) - (a.rarity || 0));

  return sorted.slice(0, limit).map((c, i) => {
    const rarity = c.rarity || c.stars || c.base_type || 4;
    const name = c.name || "Personagem";
    return {
      id: `hsr-${name.toLowerCase().replace(/\s+/g, "-")}-${i}`,
      imageUrl: c.icon || c.avatar || c.image || "",
      name,
      tier: Number(rarity) >= 5 ? HONKAI_5 : HONKAI_4,
    };
  });
}

/* ── Zenless Zone Zero ─────────────────────────────────── */

function parseZZZRank(entry: any): "S" | "A" {
  const iconText = `${entry?.rarityIcon || entry?.rankIcon || entry?.weapon?.rarityIcon || ""}`.toLowerCase();
  if (iconText.includes("rarity-s") || iconText.includes("rank-s")) return "S";
  const rank = entry?.rank ?? entry?.rarity ?? entry?.star;
  if (typeof rank === "string" && rank.toUpperCase() === "S") return "S";
  const num = typeof rank === "number" ? rank : Number(rank);
  if (Number.isFinite(num) && num >= 2) return "S";
  return "A";
}

export function getZZZPreviewItems(data: any, limit = 9): GamePreviewItem[] {
  const agents: any[] = data?.zzzCharacters || data?.zenlessCharacters || [];
  if (agents.length === 0) return [];

  const sorted = [...agents].sort((a, b) => {
    const ra = parseZZZRank(a) === "S" ? 1 : 0;
    const rb = parseZZZRank(b) === "S" ? 1 : 0;
    return rb - ra;
  });

  return sorted.slice(0, limit).map((c, i) => {
    const name = c.name || c.role_name || "Agente";
    const rank = parseZZZRank(c);
    const imageUrl =
      c.role_square_url ||
      c.icon ||
      c.avatar ||
      c.skin_list?.find((s: any) => s?.unlocked)?.skin_square_url ||
      c.role_vertical_painting_url ||
      "";
    return {
      id: `zzz-${name.toLowerCase().replace(/\s+/g, "-")}-${i}`,
      imageUrl,
      name,
      tier: rank === "S" ? ZZZ_S : ZZZ_A,
    };
  });
}

/* ── Fortnite ──────────────────────────────────────────── */

export function getFortnitePreviewItems(data: any, limit = 9): GamePreviewItem[] {
  const cosmetics = getFortniteCosmetics(data)
    .map((entry, index) => {
      const type = getFortniteType(entry);
      const rarity = String(entry?.rarity?.value || entry?.rarity || "common").toLowerCase();
      const name = entry?.name || entry?.title || `Cosmético ${index + 1}`;
      return {
        id: `fn-${String(entry?.id || name).toLowerCase().replace(/\s+/g, "-")}-${index}`,
        name,
        type,
        rarity,
        imageUrl: getFortniteIcon(entry),
      };
    })
    .filter((item) => item.imageUrl);

  if (cosmetics.length === 0) return [];

  // LZT returns skins in display order (highlighted/featured first).
  // Only filter to outfits first, preserving original order.
  const outfitsFirst = [
    ...cosmetics.filter((c) => c.type === "outfit"),
    ...cosmetics.filter((c) => c.type !== "outfit"),
  ];

  return outfitsFirst
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      imageUrl: item.imageUrl,
      name: item.name,
      tier: FORTNITE_RARITY_MAP[item.rarity] || FN_COMMON,
    }));
}

/* ── Minecraft ─────────────────────────────────────────── */

export function getMinecraftPreviewItems(data: any): GamePreviewItem[] {
  const items: GamePreviewItem[] = [];
  const mcId = data?.minecraft_id;
  const mcNick = data?.minecraft_nickname || data?.minecraft_username || data?.username;

  // Body render first (most visually impactful for card preview)
  if (mcId) {
    items.push({ id: "mc-skin-body", imageUrl: `https://crafatar.com/renders/body/${mcId}?overlay&scale=8`, name: mcNick || "Skin", tier: { ...MC_TIER, key: "skin" } });
  } else if (mcNick) {
    items.push({ id: "mc-skin-body", imageUrl: `https://minotar.net/armor/body/${mcNick}/300.png`, name: mcNick, tier: { ...MC_TIER, key: "skin" } });
  }

  // Then base64 skin / skin URL as fallbacks
  const baseSkin = toDataUrl(data?.minecraft_skin);
  const skinUrl = data?.minecraft_skin_url || data?.skin_url || data?.skinUrl || null;
  if (baseSkin) {
    items.push({ id: "mc-skin-image", imageUrl: baseSkin, name: mcNick || "Skin", tier: { ...MC_TIER, key: "skin" } });
  }
  if (skinUrl) {
    items.push({ id: "mc-skin-url", imageUrl: skinUrl, name: mcNick || "Skin", tier: { ...MC_TIER, key: "skin" } });
  }

  // Head avatar
  if (mcId) {
    items.push({ id: "mc-skin-head", imageUrl: `https://crafatar.com/avatars/${mcId}?overlay&size=128`, name: "Avatar", tier: MC_TIER });
  } else if (mcNick) {
    items.push({ id: "mc-skin-head", imageUrl: `https://minotar.net/avatar/${mcNick}/128.png`, name: "Avatar", tier: MC_TIER });
  }

  getMinecraftCapes(data).slice(0, 6).forEach((cape: any, i) => {
    const capeName = typeof cape === "string" ? cape : cape?.name || cape?.title || "Capa";
    const icon = typeof cape === "object" ? cape?.rendered || cape?.icon || cape?.url || toDataUrl(cape?.data) : null;
    if (icon) {
      items.push({ id: `mc-cape-${i}`, imageUrl: icon, name: capeName, tier: { ...MC_TIER, key: "cape" } });
    }
  });

  return items.filter((item, index, arr) => arr.findIndex((entry) => entry.imageUrl === item.imageUrl) === index).slice(0, 9);
}

/* ── LoL Rank Icons ────────────────────────────────────── */

const LOL_RANK_MAP: Record<string, string> = {
  iron: "iron",
  bronze: "bronze",
  silver: "silver",
  gold: "gold",
  platinum: "platinum",
  emerald: "emerald",
  diamond: "diamond",
  master: "master",
  grandmaster: "grandmaster",
  challenger: "challenger",
};

export function getLoLRankIcon(rankText: string | null | undefined): string | null {
  if (!rankText) return null;
  const lower = rankText.toLowerCase().trim();
  if (lower === "unranked") return null;
  for (const [key, value] of Object.entries(LOL_RANK_MAP)) {
    if (lower.includes(key)) {
      return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-mini-crests/${value}.png`;
    }
  }
  return null;
}

export function getLoLRankTier(rankText: string | null | undefined): string | null {
  if (!rankText) return null;
  const lower = rankText.toLowerCase().trim();
  if (lower === "unranked") return null;
  for (const key of Object.keys(LOL_RANK_MAP)) {
    if (lower.includes(key)) return key.charAt(0).toUpperCase() + key.slice(1);
  }
  return rankText;
}

/* ── Unified Extractor ─────────────────────────────────── */

export function getGamePreviewItems(data: any, categoryName: string, limit = 9): GamePreviewItem[] {
  if (!data) return [];
  const cat = categoryName.toLowerCase();

  if (cat.includes("genshin")) return getGenshinPreviewItems(data, limit);
  if (cat.includes("honkai") || cat.includes("star rail")) return getHonkaiPreviewItems(data, limit);
  if (cat.includes("zenless") || cat.includes("zzz")) return getZZZPreviewItems(data, limit);
  if (cat.includes("fortnite")) return getFortnitePreviewItems(data, limit);
  if (cat.includes("minecraft")) return getMinecraftPreviewItems(data);

  if (data.genshinCharacters?.length) return getGenshinPreviewItems(data, limit);
  if (data.honkaiCharacters?.length) return getHonkaiPreviewItems(data, limit);
  if (data.zzzCharacters?.length || data.zenlessCharacters?.length) return getZZZPreviewItems(data, limit);
  if (getFortniteCosmetics(data).length > 0) return getFortnitePreviewItems(data, limit);
  if (data.minecraft_id || data.minecraft_nickname || data.minecraft_skin || data.minecraft_skin_url || getMinecraftCapes(data).length > 0) return getMinecraftPreviewItems(data);

  return [];
}
