/**
 * Valorant API client with in-memory catalog cache and rarity tier enrichment.
 * Uses the public valorant-api.com API (no auth needed).
 */

// ─── Rarity Tiers ───────────────────────────────────────────────────────────
export const TIER_STYLES: Record<string, { key: string; tile: [number, number, number]; outline: [number, number, number]; label: string }> = {
  "0cebb8be-46d7-c12a-d306-e9907bfc5a25": { key: "teal", tile: [42, 88, 81], outline: [0, 149, 115], label: "Deluxe" },
  "e046854e-406c-37f4-6607-19a9ba8426fc": { key: "gold", tile: [100, 94, 58], outline: [198, 184, 96], label: "Exclusive" },
  "60bca009-4182-7998-dee7-b8a2558dc369": { key: "purple", tile: [94, 60, 104], outline: [205, 124, 191], label: "Premium" },
  "12683d76-48d7-84a3-4e09-6985794f0445": { key: "green", tile: [58, 100, 70], outline: [90, 159, 98], label: "Select" },
  "411e4a55-4e59-7757-41f0-86a53f101bb5": { key: "orange", tile: [120, 90, 40], outline: [250, 214, 99], label: "Ultra" },
};

const DEFAULT_TIER = { key: "gray", tile: [60, 60, 60] as [number, number, number], outline: [120, 120, 120] as [number, number, number], label: "Standard" };

export function getTierStyle(tierUuid: string | null | undefined) {
  if (!tierUuid) return DEFAULT_TIER;
  return TIER_STYLES[tierUuid] || DEFAULT_TIER;
}

// ─── Types ──────────────────────────────────────────────────────────────────
export interface ValorantSkin {
  uuid: string;
  displayName: string;
  displayIcon: string | null;
  contentTierUuid: string | null;
  tier: ReturnType<typeof getTierStyle>;
}

export interface ValorantAgent {
  uuid: string;
  displayName: string;
  displayIcon: string;
  bustPortrait: string | null;
  fullPortrait: string | null;
}

export interface ValorantBuddy {
  uuid: string;
  displayName: string;
  displayIcon: string;
}

export interface EnrichedInventory {
  skins: ValorantSkin[];
  agents: ValorantAgent[];
  buddies: ValorantBuddy[];
  totalSkins: number;
  totalAgents: number;
  totalBuddies: number;
}

// ─── Catalog Cache ──────────────────────────────────────────────────────────
let skinsCache: Map<string, any> | null = null;
let skinsCacheTime = 0;
let agentsCache: Map<string, any> | null = null;
let buddiesCache: Map<string, any> | null = null;

const CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchWithRetry(url: string, retries = 3): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return res.json();
    } catch {}
    if (i < retries) await new Promise(r => setTimeout(r, 500 * (i + 1)));
  }
  throw new Error(`Failed to fetch ${url}`);
}

async function getSkinsCatalog(): Promise<Map<string, any>> {
  if (skinsCache && Date.now() - skinsCacheTime < CACHE_TTL) return skinsCache;

  const data = await fetchWithRetry("https://valorant-api.com/v1/weapons/skins?language=pt-BR");
  const map = new Map<string, any>();

  for (const skin of data.data || []) {
    map.set(skin.uuid, skin);
    // Also map chromas and levels to their parent skin
    for (const chroma of skin.chromas || []) {
      if (chroma.uuid) map.set(chroma.uuid, { ...skin, displayIcon: chroma.displayIcon || skin.displayIcon });
    }
    for (const level of skin.levels || []) {
      if (level.uuid) map.set(level.uuid, { ...skin, displayIcon: level.displayIcon || skin.displayIcon });
    }
  }

  skinsCache = map;
  skinsCacheTime = Date.now();
  return map;
}

async function getAgentsCatalog(): Promise<Map<string, any>> {
  if (agentsCache) return agentsCache;

  const data = await fetchWithRetry("https://valorant-api.com/v1/agents?language=pt-BR&isPlayableCharacter=true");
  const map = new Map<string, any>();
  for (const agent of data.data || []) {
    map.set(agent.uuid, agent);
  }
  agentsCache = map;
  return map;
}

async function getBuddiesCatalog(): Promise<Map<string, any>> {
  if (buddiesCache) return buddiesCache;

  const data = await fetchWithRetry("https://valorant-api.com/v1/buddies?language=pt-BR");
  const map = new Map<string, any>();
  for (const buddy of data.data || []) {
    map.set(buddy.uuid, buddy);
    for (const level of buddy.levels || []) {
      if (level.uuid) map.set(level.uuid, { ...buddy, displayIcon: level.displayIcon || buddy.displayIcon });
    }
  }
  buddiesCache = map;
  return map;
}

// ─── Enrichment ─────────────────────────────────────────────────────────────

/**
 * Enrich Valorant inventory UUIDs with full data from the catalog.
 * Fetches catalogs in parallel, caches for 1 hour.
 */
export async function enrichValorantInventory(
  valorantInventory: Record<string, string[]>
): Promise<EnrichedInventory> {
  const skinUuids = valorantInventory.WeaponSkins || [];
  const agentUuids = valorantInventory.Agent || [];
  const buddyUuids = valorantInventory.Buddy || [];

  // Fetch all catalogs in parallel
  const [skinsCat, agentsCat, buddiesCat] = await Promise.all([
    getSkinsCatalog(),
    getAgentsCatalog(),
    getBuddiesCatalog(),
  ]);

  // Enrich skins with rarity info
  const skins: ValorantSkin[] = [];
  for (const uuid of skinUuids) {
    const catalogSkin = skinsCat.get(uuid);
    if (catalogSkin) {
      const tier = getTierStyle(catalogSkin.contentTierUuid);
      skins.push({
        uuid,
        displayName: catalogSkin.displayName || "Unknown",
        displayIcon: catalogSkin.displayIcon || `https://media.valorant-api.com/weaponskins/${uuid}/displayicon.png`,
        contentTierUuid: catalogSkin.contentTierUuid,
        tier,
      });
    } else {
      // Fallback for unknown skins
      skins.push({
        uuid,
        displayName: "Skin",
        displayIcon: `https://media.valorant-api.com/weaponskins/${uuid}/displayicon.png`,
        contentTierUuid: null,
        tier: DEFAULT_TIER,
      });
    }
  }

  // Sort skins by rarity (Ultra > Premium > Exclusive > Deluxe > Select > Standard)
  const TIER_ORDER: Record<string, number> = {
    orange: 5, purple: 4, gold: 3, teal: 2, green: 1, gray: 0,
  };
  skins.sort((a, b) => (TIER_ORDER[b.tier.key] || 0) - (TIER_ORDER[a.tier.key] || 0));

  // Enrich agents
  const agents: ValorantAgent[] = [];
  for (const uuid of agentUuids) {
    const catalogAgent = agentsCat.get(uuid);
    if (catalogAgent) {
      agents.push({
        uuid,
        displayName: catalogAgent.displayName,
        displayIcon: catalogAgent.displayIcon,
        bustPortrait: catalogAgent.bustPortrait,
        fullPortrait: catalogAgent.fullPortrait,
      });
    } else {
      agents.push({
        uuid,
        displayName: "Agente",
        displayIcon: `https://media.valorant-api.com/agents/${uuid}/displayicon.png`,
        bustPortrait: null,
        fullPortrait: null,
      });
    }
  }

  // Enrich buddies
  const buddies: ValorantBuddy[] = [];
  for (const uuid of buddyUuids) {
    const catalogBuddy = buddiesCat.get(uuid);
    if (catalogBuddy) {
      buddies.push({
        uuid,
        displayName: catalogBuddy.displayName,
        displayIcon: catalogBuddy.displayIcon,
      });
    } else {
      buddies.push({
        uuid,
        displayName: "Chaveiro",
        displayIcon: `https://media.valorant-api.com/buddies/${uuid}/displayicon.png`,
      });
    }
  }

  return {
    skins,
    agents,
    buddies,
    totalSkins: skins.length,
    totalAgents: agents.length,
    totalBuddies: buddies.length,
  };
}

/**
 * Get preview items for a card (up to 9 skins sorted by rarity).
 * Returns quickly with basic URLs, then can be enriched later.
 */
export interface QuickPreviewItem {
  uuid: string;
  type: "skin" | "agent" | "buddy";
  imageUrl: string;
  tier: ReturnType<typeof getTierStyle>;
}

export function getQuickPreviewItems(valorantInventory: Record<string, string[]>, limit = 9): QuickPreviewItem[] {
  const skinUuids = valorantInventory?.WeaponSkins || [];
  const agentUuids = valorantInventory?.Agent || [];
  const buddyUuids = valorantInventory?.Buddy || [];

  const items: QuickPreviewItem[] = [];

  // Use cache if available for rarity colors
  const hasCachedSkins = skinsCache !== null;

  for (const uuid of skinUuids.slice(0, limit)) {
    let tier = DEFAULT_TIER;
    if (hasCachedSkins) {
      const catalogSkin = skinsCache!.get(uuid);
      if (catalogSkin) tier = getTierStyle(catalogSkin.contentTierUuid);
    }
    items.push({
      uuid,
      type: "skin",
      imageUrl: `https://media.valorant-api.com/weaponskins/${uuid}/displayicon.png`,
      tier,
    });
  }

  if (items.length < limit) {
    for (const uuid of agentUuids.slice(0, limit - items.length)) {
      items.push({
        uuid,
        type: "agent",
        imageUrl: `https://media.valorant-api.com/agents/${uuid}/displayicon.png`,
        tier: { key: "agent", tile: [30, 70, 60] as [number, number, number], outline: [50, 150, 120] as [number, number, number], label: "Agent" },
      });
    }
  }

  if (items.length < limit) {
    for (const uuid of buddyUuids.slice(0, limit - items.length)) {
      items.push({
        uuid,
        type: "buddy",
        imageUrl: `https://media.valorant-api.com/buddies/${uuid}/displayicon.png`,
        tier: { key: "buddy", tile: [40, 55, 80] as [number, number, number], outline: [70, 110, 160] as [number, number, number], label: "Buddy" },
      });
    }
  }

  return items;
}

/**
 * Pre-warm the skins cache so getQuickPreviewItems can use rarity data.
 * Call once early in the app lifecycle.
 */
export async function prewarmSkinsCatalog(): Promise<void> {
  if (!skinsCache) await getSkinsCatalog();
}
