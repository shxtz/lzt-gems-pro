/**
 * League of Legends Data Dragon helper for skin previews.
 * Uses community dragon & data dragon APIs (no auth needed).
 */

// ─── Champion cache ─────────────────────────────────────────────────────────
let championsCache: Map<number, { id: string; name: string }> | null = null;
let championsCacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1h

async function getChampionsCatalog(): Promise<Map<number, { id: string; name: string }>> {
  if (championsCache && Date.now() - championsCacheTime < CACHE_TTL) return championsCache;

  try {
    const res = await fetch("https://ddragon.leagueoflegends.com/cdn/14.24.1/data/pt_BR/champion.json");
    if (!res.ok) throw new Error("Failed to fetch champions");
    const data = await res.json();
    const map = new Map<number, { id: string; name: string }>();
    for (const champ of Object.values(data.data) as any[]) {
      map.set(Number(champ.key), { id: champ.id, name: champ.name });
    }
    championsCache = map;
    championsCacheTime = Date.now();
    return map;
  } catch {
    return championsCache || new Map();
  }
}

export async function prewarmChampionsCatalog(): Promise<void> {
  if (!championsCache) await getChampionsCatalog();
}

// ─── Skin ID parsing ────────────────────────────────────────────────────────
// Skin IDs from LZT are numeric: e.g. 43008 → champion key 43, skin num 008
function parseSkinId(skinId: number): { championKey: number; skinNum: number } {
  const championKey = Math.floor(skinId / 1000);
  const skinNum = skinId % 1000;
  return { championKey, skinNum };
}

// ─── Quick preview items ────────────────────────────────────────────────────
export interface LoLPreviewItem {
  id: number;
  type: "skin" | "champion";
  imageUrl: string;
  championName: string;
  skinName: string;
  tier: { key: string; tile: [number, number, number]; outline: [number, number, number]; label: string };
}

const LOL_SKIN_TIER = { key: "lol-skin", tile: [50, 40, 20] as [number, number, number], outline: [200, 155, 60] as [number, number, number], label: "Skin" };
const LOL_CHAMP_TIER = { key: "lol-champ", tile: [25, 35, 50] as [number, number, number], outline: [100, 140, 200] as [number, number, number], label: "Campeão" };

export function getLoLQuickPreviewItems(lolInventory: any, limit = 9): LoLPreviewItem[] {
  if (!lolInventory) return [];
  
  // Handle various data formats - Skin could be array, object, or missing
  let skinIds: number[] = [];
  const rawSkins = lolInventory?.Skin || lolInventory?.skins || lolInventory?.skin || [];
  if (Array.isArray(rawSkins)) {
    skinIds = rawSkins.filter(id => typeof id === "number");
  } else if (typeof rawSkins === "object" && rawSkins !== null) {
    skinIds = Object.values(rawSkins).filter(id => typeof id === "number") as number[];
  }
  
  if (skinIds.length === 0) return [];

  for (const skinId of skinsToShow.slice(0, limit)) {
    const { championKey, skinNum } = parseSkinId(skinId);
    const champData = championsCache?.get(championKey);
    const champId = champData?.id || `Champion${championKey}`;
    const champName = champData?.name || champId;

    items.push({
      id: skinId,
      type: skinNum === 0 ? "champion" : "skin",
      imageUrl: `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champId}_${skinNum}.jpg`,
      championName: champName,
      skinName: skinNum === 0 ? champName : `${champName} Skin #${skinNum}`,
      tier: skinNum === 0 ? LOL_CHAMP_TIER : LOL_SKIN_TIER,
    });
  }

  return items;
}
