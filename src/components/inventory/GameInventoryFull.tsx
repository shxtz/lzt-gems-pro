import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, Loader2, ImageIcon, Sparkles, Swords, Star, Shield, Gamepad2 } from "lucide-react";
import { fetchEdgeJson } from "@/lib/fetchEdgeJson";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/* ── Theme definitions per game ────────────────────────── */

interface GameTheme {
  name: string;
  primary: string;       // CSS color for accents
  primaryRgb: string;    // r,g,b for opacity variants
  gradientFrom: string;
  gradientTo: string;
  filterStyle?: string;  // CSS filter for images
  icon: any;
}

const GAME_THEMES: Record<string, GameTheme> = {
  genshin: {
    name: "Genshin Impact",
    primary: "rgb(200, 169, 110)",
    primaryRgb: "200,169,110",
    gradientFrom: "#c8a96e",
    gradientTo: "#6b5a30",
    filterStyle: "brightness(1.1) saturate(1.3)",
    icon: Star,
  },
  honkai: {
    name: "Honkai: Star Rail",
    primary: "rgb(130, 110, 255)",
    primaryRgb: "130,110,255",
    gradientFrom: "#6c5ce7",
    gradientTo: "#3d2d9e",
    filterStyle: "brightness(1.1) saturate(1.2) hue-rotate(-5deg)",
    icon: Sparkles,
  },
  lol: {
    name: "League of Legends",
    primary: "rgb(200, 155, 60)",
    primaryRgb: "200,155,60",
    gradientFrom: "#c89b3c",
    gradientTo: "#0a1428",
    filterStyle: "brightness(1.05) saturate(1.2)",
    icon: Shield,
  },
  fortnite: {
    name: "Fortnite",
    primary: "rgb(157, 77, 187)",
    primaryRgb: "157,77,187",
    gradientFrom: "#9d4dbb",
    gradientTo: "#2f7bc7",
    filterStyle: "brightness(1.1) saturate(1.3)",
    icon: Swords,
  },
  minecraft: {
    name: "Minecraft",
    primary: "rgb(93, 140, 62)",
    primaryRgb: "93,140,62",
    gradientFrom: "#5d8c3e",
    gradientTo: "#3a6220",
    icon: Gamepad2,
  },
  zzz: {
    name: "Zenless Zone Zero",
    primary: "rgb(245, 212, 66)",
    primaryRgb: "245,212,66",
    gradientFrom: "#f5d442",
    gradientTo: "#1a1a2e",
    filterStyle: "brightness(1.1) contrast(1.1)",
    icon: Sparkles,
  },
};

const DEFAULT_THEME: GameTheme = {
  name: "Jogo",
  primary: "hsl(var(--primary))",
  primaryRgb: "180,140,80",
  gradientFrom: "#b48c50",
  gradientTo: "#3d2d1e",
  icon: Gamepad2,
};

/* ── Types ──────────────────────────────────────────────── */

interface InventoryItem {
  id: string;
  name: string;
  icon: string | null;
  type: string;
  rarity: number | string;
  tier: { key: string; name: string; color: number[]; bgColor: number[] };
  element?: string | null;
  weapon?: string | null;
  constellation?: number;
  eidolon?: number;
  path?: string | null;
}

interface GalleryImage {
  label: string;
  url: string;
}

interface GameInventoryData {
  game: string;
  items: InventoryItem[];
  tabs: { key: string; label: string; count: number }[];
  gallery: GalleryImage[];
  theme: { primary: number[]; accent: number[]; bg: number[] };
  weapons?: InventoryItem[];
  lightcones?: InventoryItem[];
}

interface Props {
  lztData: any;
  accountId: string;
  categoryName: string;
}

/* ── Proxy helper ───────────────────────────────────────── */
function proxyUrl(url: string): string {
  if (!SUPABASE_URL || url.startsWith("https://ddragon") || url.startsWith("https://genshin.jmp.blue")) return url;
  return `${SUPABASE_URL}/functions/v1/lzt-proxy?image_url=${encodeURIComponent(url)}`;
}

/* ── Component ──────────────────────────────────────────── */

export default function GameInventoryFull({ lztData, accountId, categoryName }: Props) {
  const [data, setData] = useState<GameInventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [rarityFilter, setRarityFilter] = useState<string>("all");
  const [showGallery, setShowGallery] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const gameKey = useMemo(() => {
    const cat = categoryName.toLowerCase();
    if (cat.includes("genshin")) return "genshin";
    if (cat.includes("honkai") || cat.includes("star rail")) return "honkai";
    if (cat.includes("lol") || cat.includes("league")) return "lol";
    if (cat.includes("fortnite")) return "fortnite";
    if (cat.includes("minecraft")) return "minecraft";
    if (cat.includes("zenless") || cat.includes("zzz")) return "zzz";
    return "unknown";
  }, [categoryName]);

  const theme = GAME_THEMES[gameKey] || DEFAULT_THEME;
  const ThemeIcon = theme.icon;

  useEffect(() => {
    if (!accountId) { setLoading(false); return; }

    const load = async () => {
      setLoading(true);
      try {
        const result = await fetchEdgeJson(
          `${SUPABASE_URL}/functions/v1/game-inventory?account_id=${accountId}&game=${gameKey}`,
          { retries: 2, retryDelayMs: 500 }
        );
        setData(result);
        if (result.tabs?.length > 0) setActiveTab(result.tabs[0].key);
      } catch (err) {
        console.error("Failed to load game inventory:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accountId, gameKey]);

  // Determine items to display based on active tab
  const allItems = useMemo(() => {
    if (!data) return [];
    if (activeTab === "skins" && data.skins) return data.skins;
    if (activeTab === "champions" && data.champions) return data.champions;
    if (activeTab === "weapons" && data.weapons) return data.weapons;
    if (activeTab === "lightcones" && data.lightcones) return data.lightcones;
    return data.items || [];
  }, [data, activeTab]);

  const filteredItems = useMemo(() => {
    if (rarityFilter === "all") return allItems;
    return allItems.filter(i => String(i.tier?.key) === rarityFilter);
  }, [allItems, rarityFilter]);

  // Rarity counts for filters
  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allItems) {
      const key = item.tier?.key || "unknown";
      counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
  }, [allItems]);

  // Unique tiers for filter buttons
  const uniqueTiers = useMemo(() => {
    const seen = new Map<string, { key: string; name: string; color: number[] }>();
    for (const item of allItems) {
      if (item.tier && !seen.has(item.tier.key)) {
        seen.set(item.tier.key, { key: item.tier.key, name: item.tier.name, color: item.tier.color });
      }
    }
    return Array.from(seen.values());
  }, [allItems]);

  const gallery = data?.gallery || [];
  const hasItems = allItems.length > 0;
  const hasGallery = gallery.length > 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <ThemeIcon className="h-5 w-5" style={{ color: theme.primary }} />
          <h3 className="font-display text-lg font-bold text-foreground">Inventário</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl border border-border/20" style={{ backgroundColor: `rgba(${theme.primaryRgb}, 0.05)` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!hasItems && !hasGallery) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ThemeIcon className="h-5 w-5" style={{ color: theme.primary }} />
          <h3 className="font-display text-lg font-bold text-foreground">Inventário</h3>
          {hasGallery && hasItems && (
            <button
              onClick={() => setShowGallery(!showGallery)}
              className="ml-3 flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-medium border transition-all"
              style={{
                borderColor: showGallery ? `rgba(${theme.primaryRgb}, 0.4)` : undefined,
                backgroundColor: showGallery ? `rgba(${theme.primaryRgb}, 0.1)` : undefined,
                color: showGallery ? theme.primary : undefined,
              }}
            >
              <ImageIcon className="h-3 w-3" />
              Galeria
            </button>
          )}
        </div>
      </div>

      {/* Gallery Mode */}
      <AnimatePresence>
        {(showGallery || !hasItems) && hasGallery && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {gallery.map((img, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-border/30">
                <div className="text-[10px] font-display uppercase tracking-wider px-3 py-1.5 border-b border-border/20" style={{ color: theme.primary, backgroundColor: `rgba(${theme.primaryRgb}, 0.05)` }}>
                  {img.label}
                </div>
                <img
                  src={proxyUrl(img.url)}
                  alt={img.label}
                  className="w-full object-contain"
                  loading="lazy"
                  style={{ filter: theme.filterStyle }}
                />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      {hasItems && data && data.tabs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {data.tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setRarityFilter("all"); }}
              className="flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all border"
              style={{
                borderColor: activeTab === tab.key ? `rgba(${theme.primaryRgb}, 0.4)` : undefined,
                backgroundColor: activeTab === tab.key ? `rgba(${theme.primaryRgb}, 0.1)` : undefined,
                color: activeTab === tab.key ? theme.primary : undefined,
              }}
            >
              {tab.label}
              <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-bold">{tab.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Rarity Filters */}
      {hasItems && uniqueTiers.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <button
            onClick={() => setRarityFilter("all")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all border ${
              rarityFilter === "all"
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border/20 bg-muted/5 text-muted-foreground hover:bg-muted/15"
            }`}
          >
            Todas <span className="text-[9px] opacity-60">({allItems.length})</span>
          </button>
          {uniqueTiers.map((tier) => {
            const count = rarityCounts[tier.key] || 0;
            if (count === 0) return null;
            const isActive = rarityFilter === tier.key;
            return (
              <button
                key={tier.key}
                onClick={() => setRarityFilter(tier.key)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all border"
                style={{
                  borderColor: isActive ? `rgba(${tier.color.join(",")}, 0.5)` : undefined,
                  backgroundColor: isActive ? `rgba(${tier.color.join(",")}, 0.1)` : undefined,
                  color: isActive ? `rgb(${tier.color.join(",")})` : undefined,
                }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: `rgb(${tier.color.join(",")})` }}
                />
                {tier.name}
                <span className="text-[9px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Items Grid */}
      {hasItems && !showGallery && (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${rarityFilter}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
          >
            {filteredItems.map((item, i) => {
              const tier = item.tier;
              const tileColor = tier ? `rgb(${tier.bgColor[0]}, ${tier.bgColor[1]}, ${tier.bgColor[2]})` : undefined;
              const outlineColor = tier ? `rgb(${tier.color[0]}, ${tier.color[1]}, ${tier.color[2]})` : undefined;
              const hasImage = item.icon && !failedImages.has(item.id);

              return (
                <motion.div
                  key={item.id + i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4), duration: 0.25 }}
                  className="group/tile relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.04]"
                  style={{
                    background: tileColor
                      ? `linear-gradient(135deg, ${tileColor}, rgba(0,0,0,0.6))`
                      : `linear-gradient(135deg, rgba(${theme.primaryRgb}, 0.15), rgba(0,0,0,0.5))`,
                    border: outlineColor ? `1.5px solid ${outlineColor}40` : "1px solid hsl(var(--border))",
                    boxShadow: outlineColor
                      ? `0 0 12px ${outlineColor}20, inset 0 0 20px rgba(0,0,0,0.3)`
                      : undefined,
                  }}
                >
                  <div className="aspect-square flex items-center justify-center overflow-hidden p-3">
                    {hasImage ? (
                      <img
                        src={item.icon!}
                        alt={item.name}
                        className="h-full w-full object-contain transition-transform duration-500 group-hover/tile:scale-110 drop-shadow-lg"
                        loading="lazy"
                        style={{ filter: theme.filterStyle }}
                        onError={() => setFailedImages(prev => new Set(prev).add(item.id))}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 text-center">
                        <ThemeIcon
                          className="h-8 w-8 opacity-30"
                          style={{ color: outlineColor || theme.primary }}
                        />
                        <span className="text-[10px] text-muted-foreground font-medium leading-tight px-1">
                          {item.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Rarity indicator */}
                  {outlineColor && (
                    <div className="absolute top-1.5 right-1.5">
                      <span
                        className="inline-block h-3 w-3 rounded-sm"
                        style={{
                          background: `linear-gradient(135deg, ${outlineColor}, ${outlineColor}80)`,
                          boxShadow: `0 0 6px ${outlineColor}60`,
                        }}
                      />
                    </div>
                  )}

                  {/* Extra info badges */}
                  {(item.constellation !== undefined && item.constellation > 0) && (
                    <div className="absolute top-1.5 left-1.5">
                      <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: `rgba(${theme.primaryRgb}, 0.3)`, color: theme.primary }}>
                        C{item.constellation}
                      </span>
                    </div>
                  )}
                  {(item.eidolon !== undefined && item.eidolon > 0) && (
                    <div className="absolute top-1.5 left-1.5">
                      <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: `rgba(${theme.primaryRgb}, 0.3)`, color: theme.primary }}>
                        E{item.eidolon}
                      </span>
                    </div>
                  )}

                  {/* Element badge */}
                  {item.element && (
                    <div className="absolute bottom-8 right-1.5">
                      <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-black/50 text-white/80">
                        {item.element}
                      </span>
                    </div>
                  )}

                  {/* Name overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent px-2 pb-2 pt-8">
                    <p className="text-[11px] font-semibold text-white leading-tight line-clamp-2 drop-shadow-md text-center">
                      {item.name}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Empty state with filter */}
      {hasItems && !showGallery && filteredItems.length === 0 && rarityFilter !== "all" && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhum item encontrado com este filtro.
        </div>
      )}
    </div>
  );
}
