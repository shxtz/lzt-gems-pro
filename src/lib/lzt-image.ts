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
  return null;
}

export interface InventoryImages {
  weapons: string | null;
  agents: string | null;
  buddies: string | null;
}

/**
 * Get all inventory images (weapons, agents, buddies) for display.
 * Returns proxied URLs ready for <img> tags.
 */
export function getLztInventoryImages(lztData: any): InventoryImages {
  const result: InventoryImages = { weapons: null, agents: null, buddies: null };
  if (!lztData) return result;

  const links = lztData.imagePreviewLinks || lztData.image_preview_links;
  if (!links) return result;

  // Prefer download URLs (auth handled by proxy), fallback to direct (JWT embedded)
  for (const key of ["weapons", "agents", "buddies"] as const) {
    const url = links.download?.[key] || links.direct?.[key];
    if (url) result[key] = proxyUrl(url);
  }

  return result;
}
