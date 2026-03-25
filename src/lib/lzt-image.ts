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

function getPreviewFromLztData(lztData: any, categoryName?: string): string | null {
  if (!lztData) return null;

  const links = lztData.imagePreviewLinks || lztData.image_preview_links;
  if (!links) return null;

  // Determine preferred keys from category name
  const slug = (categoryName || "").toLowerCase();
  const keys = Object.entries(PREFERRED_KEYS).find(([k]) =>
    slug.includes(k)
  )?.[1] || ["weapons", "agents", "skins"];

  // Try direct URLs first (they contain embedded JWT), then download
  for (const source of [links.direct, links.download]) {
    if (!source || typeof source !== "object") continue;
    for (const key of keys) {
      if (source[key]) return source[key];
    }
    // Fallback: first available key
    const firstVal = Object.values(source).find(
      (v) => typeof v === "string"
    ) as string | undefined;
    if (firstVal) return firstVal;
  }

  // If imagePreviewLinks is a flat string or array
  if (typeof links === "string") return links;
  if (Array.isArray(links) && links.length > 0) return links[0];

  return null;
}

/**
 * Get the best image URL for an LZT account.
 * Uses the lzt-proxy edge function to avoid CORS issues.
 */
export function getLztAccountImageUrl(lztData: any, categoryName?: string): string | null {
  if (!lztData) return null;

  // Try imagePreviewLinks first
  const previewUrl = getPreviewFromLztData(lztData, categoryName);
  if (previewUrl && SUPABASE_URL) {
    return `${SUPABASE_URL}/functions/v1/lzt-proxy?image_url=${encodeURIComponent(previewUrl)}`;
  }

  // Direct preview URL if already proxied or data URI
  if (previewUrl) return previewUrl;

  return null;
}
