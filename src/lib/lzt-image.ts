const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Preferred imagePreviewLinks keys per game category.
 * Order matters: first match wins.
 */
const PREFERRED_KEYS: Record<string, string[]> = {
  valorant: ["weapons", "agents", "buddies"],
  riot: ["weapons", "agents", "buddies"],
  fortnite: ["skins", "pickaxes", "emotes", "gliders"],
  genshin: ["genshin", "characters", "weapons"],
  honkai: ["honkai", "characters", "weapons"],
  zenless: ["zenless", "zzz", "characters", "weapons"],
  brawl: ["brawlers"],
  steam: ["games", "inventory"],
  lol: ["champions", "skins"],
  minecraft: ["profile", "inventory"],
  telegram: ["profile"],
  discord: ["profile"],
};

function proxyUrl(url: string): string {
  if (!SUPABASE_URL || !/https?:\/\/(?:prod-api|api)\.lzt\.market/i.test(url)) return url;
  return `${SUPABASE_URL}/functions/v1/lzt-proxy?image_url=${encodeURIComponent(url)}`;
}

function toDataUrl(base64: string | null | undefined): string | null {
  if (!base64 || typeof base64 !== "string") return null;
  return base64.startsWith("data:") ? base64 : `data:image/png;base64,${base64}`;
}

function getPreviewFromLztData(lztData: any, categoryName?: string): string | null {
  if (!lztData) return null;

  const links = lztData.imagePreviewLinks || lztData.image_preview_links;
  if (!links) return null;

  if (typeof links === "string") return links;
  if (Array.isArray(links)) {
    const first = links.find((item) => typeof item === "string" && item.length > 0);
    return first || null;
  }

  const slug = (categoryName || "").toLowerCase();
  const preferredEntry = Object.entries(PREFERRED_KEYS).find(([k]) => slug.includes(k));
  const keys = preferredEntry?.[1] || ["weapons", "agents", "skins"];
  const hasGameSpecificPreference = Boolean(preferredEntry);

  for (const source of [links.download, links.direct]) {
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    for (const key of keys) {
      if (source[key]) return source[key];
    }
    if (!hasGameSpecificPreference) {
      const firstVal = Object.values(source).find((v) => typeof v === "string") as string | undefined;
      if (firstVal) return firstVal;
    }
  }

  return null;
}

/**
 * Get the best single image URL for an LZT account (used for card banner).
 */
export function getLztAccountImageUrl(lztData: any, categoryName?: string): string | null {
  if (!lztData) return null;
  const previewUrl = getPreviewFromLztData(lztData, categoryName);
  if (previewUrl) return proxyUrl(previewUrl);

  const zzzCharacter = lztData?.zzzCharacters?.[0] || lztData?.zenlessCharacters?.[0];
  const firstCharacterImage =
    lztData?.genshinCharacters?.[0]?.image ||
    lztData?.genshinCharacters?.[0]?.icon ||
    lztData?.honkaiCharacters?.[0]?.icon ||
    zzzCharacter?.role_square_url ||
    zzzCharacter?.skin_list?.find((skin: any) => skin?.unlocked)?.skin_square_url ||
    zzzCharacter?.role_vertical_painting_url ||
    zzzCharacter?.weapon?.icon ||
    zzzCharacter?.avatar ||
    zzzCharacter?.icon;
  if (typeof firstCharacterImage === "string") return firstCharacterImage;

  const firstCape = Array.isArray(lztData?.minecraft_capes) ? lztData.minecraft_capes[0] : null;
  const capeImage = typeof firstCape === "object" ? (firstCape?.rendered || firstCape?.icon || firstCape?.url || toDataUrl(firstCape?.data)) : null;
  if (capeImage) return capeImage;

  const minecraftSkin = toDataUrl(lztData.minecraft_skin);
  if (minecraftSkin) return minecraftSkin;

  const mcId = lztData.minecraft_id;
  const mcNick = lztData.minecraft_nickname;
  if (mcId) return `https://crafatar.com/renders/body/${mcId}?overlay&scale=4`;
  if (mcNick) return `https://minotar.net/armor/body/${mcNick}/300.png`;

  return null;
}

export interface InventoryImages {
  weapons: string | null;
  agents: string | null;
  buddies: string | null;
  [key: string]: string | null;
}

export function getLztInventoryImages(lztData: any): InventoryImages {
  const result: InventoryImages = { weapons: null, agents: null, buddies: null };
  if (!lztData) return result;

  const links = lztData.imagePreviewLinks || lztData.image_preview_links;
  if (Array.isArray(links)) {
    links.forEach((url, index) => {
      if (typeof url === "string" && url) result[`preview_${index + 1}`] = proxyUrl(url);
    });
  } else if (links && typeof links === "object") {
    const allKeys = new Set<string>();
    for (const source of [links.download, links.direct]) {
      if (source && typeof source === "object" && !Array.isArray(source)) {
        Object.keys(source).forEach((k) => allKeys.add(k));
      }
    }

    for (const key of allKeys) {
      const url = links.download?.[key] || links.direct?.[key];
      if (url && typeof url === "string") result[key] = proxyUrl(url);
    }
  }

  const minecraftSkin = toDataUrl(lztData?.minecraft_skin);
  if (minecraftSkin) result.skin = minecraftSkin;
  if (lztData?.minecraft_id) result.skin_render = `https://crafatar.com/renders/body/${lztData.minecraft_id}?overlay&scale=8`;
  else if (lztData?.minecraft_nickname) result.skin_render = `https://minotar.net/armor/body/${lztData.minecraft_nickname}/300.png`;

  if (Array.isArray(lztData?.minecraft_capes)) {
    lztData.minecraft_capes.slice(0, 4).forEach((cape: any, index: number) => {
      const icon = typeof cape === "object" ? (cape?.rendered || cape?.icon || cape?.url || toDataUrl(cape?.data)) : null;
      if (icon) result[`cape_${index + 1}`] = icon;
    });
  }

  const fallbackImages = [
    lztData?.genshinCharacters?.[0]?.image,
    lztData?.genshinCharacters?.[1]?.image,
    lztData?.honkaiCharacters?.[0]?.icon,
    lztData?.honkaiCharacters?.[1]?.icon,
    lztData?.zenlessCharacters?.[0]?.role_square_url,
    lztData?.zenlessCharacters?.[0]?.weapon?.icon,
    lztData?.zenlessCharacters?.[0]?.icon,
    lztData?.zzzCharacters?.[0]?.role_square_url,
    lztData?.zzzCharacters?.[0]?.weapon?.icon,
    lztData?.zzzCharacters?.[0]?.icon,
  ].filter((url): url is string => typeof url === "string" && url.length > 0);

  fallbackImages.slice(0, 4).forEach((url, index) => {
    if (!result[`fallback_${index + 1}`]) result[`fallback_${index + 1}`] = url;
  });

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
