import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VALORANT_API = "https://valorant-api.com/v1";

const TIER_STYLES: Record<string, { key: string; tile: number[]; outline: number[]; badge: number[] }> = {
  "60bca009-4182-7998-dee7-b8a2558dc369": { key: "purple", tile: [94, 60, 104], outline: [205, 124, 191], badge: [225, 89, 169] },
  "0cebb8be-46d7-c12a-d306-e9907bfc5a25": { key: "teal", tile: [22, 91, 86], outline: [62, 198, 185], badge: [0, 222, 206] },
  "12683d76-48d7-84a3-4e09-6985794f0445": { key: "blue", tile: [53, 80, 120], outline: [117, 183, 242], badge: [72, 179, 255] },
  "e046854e-406c-37f4-6607-19a9ba8426fc": { key: "gold", tile: [100, 94, 58], outline: [198, 184, 96], badge: [232, 205, 74] },
  "411e4a55-4e59-7757-41f0-86a53f101bb5": { key: "orange", tile: [120, 90, 40], outline: [250, 214, 99], badge: [255, 195, 50] },
};
const FALLBACK_STYLE = { key: "brown", tile: [102, 74, 56], outline: [184, 149, 112], badge: [241, 152, 80] };
const AGENT_STYLE = { key: "agent", tile: [40, 50, 70], outline: [100, 140, 200], badge: [100, 160, 255] };
const BUDDY_STYLE = { key: "buddy", tile: [60, 50, 40], outline: [160, 130, 100], badge: [200, 160, 100] };

// Caches
let skinCatalogCache: Map<string, any> | null = null;
let agentCatalogCache: Map<string, any> | null = null;
let buddyCatalogCache: Map<string, any> | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60 * 60 * 1000;

async function fetchCatalog(endpoint: string): Promise<Map<string, any>> {
  const res = await fetch(`${VALORANT_API}/${endpoint}?language=pt-BR`);
  const json = await res.json();
  const map = new Map<string, any>();
  for (const item of json.data || []) {
    map.set(item.uuid, item);
  }
  return map;
}

async function ensureCatalogs() {
  if (skinCatalogCache && Date.now() - cacheTimestamp < CACHE_TTL) return;
  const [skins, agents, buddies] = await Promise.all([
    fetchCatalog("weapons/skins"),
    fetchCatalog("agents"),
    fetchCatalog("buddies"),
  ]);
  skinCatalogCache = skins;
  agentCatalogCache = agents;
  buddyCatalogCache = buddies;
  cacheTimestamp = Date.now();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const accountId = url.searchParams.get("account_id");

    if (!accountId) {
      return new Response(JSON.stringify({ error: "account_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Read from lzt_accounts table (data column)
    const { data: account } = await supabase
      .from("lzt_accounts")
      .select("data")
      .eq("id", accountId)
      .maybeSingle();

    const lztData = account?.data as any;
    const inventory = lztData?.valorantInventory;
    if (!inventory) {
      return new Response(JSON.stringify({ skins: [], agents: [], buddies: [], totalSkins: 0, totalAgents: 0, totalBuddies: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await ensureCatalogs();

    // --- Weapon Skins ---
    const rawSkins = inventory.WeaponSkins || inventory.WeaponSkin || inventory.Skins || inventory.Skin || inventory.weapon_skins || inventory.weapon_skin;
    const skinUUIDs: string[] = rawSkins
      ? (Array.isArray(rawSkins) ? rawSkins : Object.values(rawSkins))
      : [];

    const enrichedSkins: any[] = [];
    const seenSkins = new Set<string>();

    for (const uuid of skinUUIDs) {
      if (seenSkins.has(uuid)) continue;

      // Try direct skin match
      let skin = skinCatalogCache!.get(uuid);
      if (skin) {
        seenSkins.add(uuid);
        const tierUuid = skin.contentTierUuid;
        const tier = (tierUuid && TIER_STYLES[tierUuid]) || FALLBACK_STYLE;
        const icon = skin.chromas?.[0]?.fullRender || skin.chromas?.[0]?.displayIcon || skin.displayIcon;
        const tierIcon = tierUuid
          ? `https://media.valorant-api.com/contenttiers/${tierUuid}/displayicon.png`
          : null;
        enrichedSkins.push({ uuid, name: (skin.displayName || "Unknown").slice(0, 36), icon, tierIcon, tier });
        continue;
      }

      // Try matching against chroma/level UUIDs
      for (const [, s] of skinCatalogCache!) {
        if (seenSkins.has(s.uuid)) continue;
        let found = false;

        if (s.chromas) {
          for (const c of s.chromas) {
            if (c.uuid === uuid) {
              found = true;
              const tierUuid = s.contentTierUuid;
              const tier = (tierUuid && TIER_STYLES[tierUuid]) || FALLBACK_STYLE;
              const icon = c.fullRender || c.displayIcon || s.displayIcon;
              const tierIcon = tierUuid
                ? `https://media.valorant-api.com/contenttiers/${tierUuid}/displayicon.png`
                : null;
              seenSkins.add(s.uuid);
              enrichedSkins.push({ uuid: s.uuid, name: (s.displayName || "Unknown").slice(0, 36), icon, tierIcon, tier });
              break;
            }
          }
        }
        if (found) break;

        if (s.levels) {
          for (const l of s.levels) {
            if (l.uuid === uuid) {
              found = true;
              const tierUuid = s.contentTierUuid;
              const tier = (tierUuid && TIER_STYLES[tierUuid]) || FALLBACK_STYLE;
              const icon = s.chromas?.[0]?.fullRender || s.chromas?.[0]?.displayIcon || l.displayIcon || s.displayIcon;
              const tierIcon = tierUuid
                ? `https://media.valorant-api.com/contenttiers/${tierUuid}/displayicon.png`
                : null;
              seenSkins.add(s.uuid);
              enrichedSkins.push({ uuid: s.uuid, name: (s.displayName || "Unknown").slice(0, 36), icon, tierIcon, tier });
              break;
            }
          }
        }
        if (found) break;
      }
    }

    // Sort by tier rarity
    const TIER_ORDER: Record<string, number> = { orange: 5, purple: 4, gold: 3, teal: 2, blue: 1, brown: 0 };
    enrichedSkins.sort((a, b) => (TIER_ORDER[b.tier.key] || 0) - (TIER_ORDER[a.tier.key] || 0));

    // --- Agents ---
    const rawAgents = inventory.Agent || inventory.Agents || inventory.agent;
    const agentUUIDs: string[] = rawAgents
      ? (Array.isArray(rawAgents) ? rawAgents : Object.values(rawAgents))
      : [];
    const enrichedAgents = agentUUIDs.slice(0, 30).map((uuid: string) => {
      const agent = agentCatalogCache!.get(uuid);
      if (!agent || !agent.isPlayableCharacter) return null;
      return {
        uuid,
        name: (agent.displayName || "Unknown").slice(0, 36),
        icon: agent.displayIcon || agent.bustPortrait || agent.fullPortrait || null,
        fullPortrait: agent.fullPortrait || null,
        tier: AGENT_STYLE,
      };
    }).filter(Boolean);

    // --- Buddies ---
    const rawBuddies = inventory.Buddy || inventory.Buddies || inventory.buddy;
    const buddyUUIDs: string[] = rawBuddies
      ? (Array.isArray(rawBuddies) ? rawBuddies : Object.values(rawBuddies))
      : [];
    const enrichedBuddies = buddyUUIDs.slice(0, 50).map((uuid: string) => {
      const buddy = buddyCatalogCache!.get(uuid);
      if (!buddy) return { uuid, name: "Unknown", icon: null, tier: BUDDY_STYLE };
      return {
        uuid,
        name: (buddy.displayName || "Unknown").slice(0, 36),
        icon: buddy.displayIcon || null,
        tier: BUDDY_STYLE,
      };
    });

    return new Response(JSON.stringify({
      skins: enrichedSkins,
      totalSkins: skinUUIDs.length,
      agents: enrichedAgents,
      totalAgents: agentUUIDs.length,
      buddies: enrichedBuddies,
      totalBuddies: buddyUUIDs.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=300" },
    });
  } catch (err: any) {
    console.error("valorant-inventory error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
