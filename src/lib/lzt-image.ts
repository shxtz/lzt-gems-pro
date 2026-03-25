const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Preferred imagePreviewLinks keys per game category.
 * Order matters: first match wins.
 */
const PREFERRED_KEYS: Record<string, string[]> = {
  valorant: ["weapons", "agents", "buddies"],
  riot: ["weapons", "agents", "buddies"],
  fortnite: ["skins", "pickaxes", "emotes", "gliders"],
  genshin: ["characters", "weapons"],
  honkai: ["characters", "weapons"],
  zenless: ["characters", "weapons"],
  brawl: ["brawlers"],
  steam: ["games", "inventory"],
  lol: ["champions", "skins"],
  telegram: ["profile"],
  discord: ["profile"],
};

function proxyUrl(url: string): string {
  if (!SUPABASE_URL) return url;
  return `${SUPABASE_URL}/functions/v1/lzt-proxy?image_url=${encodeURIComponent(url)}`;
}

function getPreviewFromLztData(lztData: any, categoryName?: string): string | null {
  if (!lztData) return null;

  const links = lztData.imagePreviewLinks || lztData.image_preview_links;
  if (!links) return null;

  const slug = (categoryName || "").toLowerCase();
  const keys = Object.entries(PREFERRED_KEYS).find(([k]) =>
    slug.includes(k)
  )?.[1] || ["weapons", "agents", "skins"];

  // Prefer download URLs (higher quality, proxied with auth)
  for (const source of [links.download, links.direct]) {
    if (!source || typeof source !== "object") continue;
    for (const key of keys) {
      if (source[key]) return source[key];
    }
    const firstVal = Object.values(source).find(
      (v) => typeof v === "string"
    ) as string | undefined;
    if (firstVal) return firstVal;
  }

  if (typeof links === "string") return links;
  if (Array.isArray(links) && links.length > 0) return links[0];

  return null;
}

/**
 * Get the best single image URL for an LZT account (used for card banner).
 */
export function getLztAccountImageUrl(lztData: any, categoryName?: string): string | null {
  if (!lztData) return null;
  const previewUrl = getPreviewFromLztData(lztData, categoryName);
  if (previewUrl) return proxyUrl(previewUrl);

  // Minecraft: render skin via Crafatar from minecraft_id or nickname
  const mcId = lztData.minecraft_id;
  const mcNick = lztData.minecraft_nickname;
  if (mcId) return `https://crafatar.com/renders/body/${mcId}?overlay&scale=4`;
  if (mcNick) return `https://minotar.net/armor/body/${mcNick}/300.png`;

  // Minecraft skin base64 → data URI
  if (lztData.minecraft_skin && typeof lztData.minecraft_skin === "string" && lztData.minecraft_skin.length > 100) {
    return `data:image/png;base64,${lztData.minecraft_skin}`;
  }

  return null;
}

export interface InventoryImages {
  weapons: string | null;
  agents: string | null;
  buddies: string | null;
  [key: string]: string | null;
}

/**
 * Get all inventory images for display.
 * Returns proxied URLs ready for <img> tags.
 * Supports Valorant (weapons/agents/buddies), Genshin/Honkai/ZZZ, and generic keys.
 */
export function getLztInventoryImages(lztData: any): InventoryImages {
  const result: InventoryImages = { weapons: null, agents: null, buddies: null };
  if (!lztData) return result;

  const links = lztData.imagePreviewLinks || lztData.image_preview_links;
  if (!links || Array.isArray(links)) return result;

  // Collect all available image keys from download and direct
  const allKeys = new Set<string>();
  for (const source of [links.download, links.direct]) {
    if (source && typeof source === "object" && !Array.isArray(source)) {
      Object.keys(source).forEach(k => allKeys.add(k));
    }
  }

  for (const key of allKeys) {
    const url = links.download?.[key] || links.direct?.[key];
    if (url && typeof url === "string") result[key] = proxyUrl(url);
  }

  return result;
}

/**
 * Individual inventory item with image URL from valorant-api.com
 */
export interface InventoryItem {
  uuid: string;
  type: "skin" | "agent" | "buddy";
  imageUrl: string;
}

/**
 * Extract individual inventory items from valorantInventory data.
 * Uses valorant-api.com media URLs which are publicly accessible (no proxy needed).
 * Returns up to `limit` items, prioritizing skins, then agents, then buddies.
 */
export function getValorantInventoryItems(lztData: any, limit = 9): InventoryItem[] {
  if (!lztData) return [];

  const inventory = lztData.valorantInventory;
  if (!inventory || typeof inventory !== "object") return [];

  const items: InventoryItem[] = [];

  // WeaponSkins first (most visually interesting)
  const skins = Array.isArray(inventory.WeaponSkins) ? inventory.WeaponSkins : [];
  for (const uuid of skins) {
    if (items.length >= limit) break;
    if (typeof uuid === "string" && uuid.length > 10) {
      items.push({
        uuid,
        type: "skin",
        imageUrl: `https://media.valorant-api.com/weaponskins/${uuid}/displayicon.png`,
      });
    }
  }

  // Agents
  const agents = Array.isArray(inventory.Agent) ? inventory.Agent : [];
  for (const uuid of agents) {
    if (items.length >= limit) break;
    if (typeof uuid === "string" && uuid.length > 10) {
      items.push({
        uuid,
        type: "agent",
        imageUrl: `https://media.valorant-api.com/agents/${uuid}/displayicon.png`,
      });
    }
  }

  // Buddies
  const buddies = Array.isArray(inventory.Buddy) ? inventory.Buddy : [];
  for (const uuid of buddies) {
    if (items.length >= limit) break;
    if (typeof uuid === "string" && uuid.length > 10) {
      items.push({
        uuid,
        type: "buddy",
        imageUrl: `https://media.valorant-api.com/buddies/${uuid}/displayicon.png`,
      });
    }
  }

  return items;
}
