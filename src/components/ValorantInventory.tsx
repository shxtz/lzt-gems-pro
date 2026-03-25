import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, Users, Sparkles, Loader2, Filter, Swords } from "lucide-react";
import { fetchEdgeJson } from "@/lib/fetchEdgeJson";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface ValorantInventoryProps {
  lztData: any;
  accountId?: string;
  compact?: boolean;
}

type TabKey = "skins" | "agents" | "buddies";

interface EnrichedSkin {
  uuid: string;
  name: string;
  icon: string | null;
  tierIcon: string | null;
  tier: { key: string; tile: number[]; outline: number[]; badge: number[] };
}

interface EnrichedAgent {
  uuid: string;
  name: string;
  icon: string | null;
  fullPortrait?: string | null;
  tier: { key: string; tile: number[]; outline: number[]; badge: number[] };
}

interface EnrichedBuddy {
  uuid: string;
  name: string;
  icon: string | null;
  tier: { key: string; tile: number[]; outline: number[]; badge: number[] };
}

const RARITY_FILTERS = [
  { key: "all", label: "Todas", color: null },
  { key: "orange", label: "Ultra", color: [250, 214, 99] },
  { key: "purple", label: "Premium", color: [205, 124, 191] },
  { key: "gold", label: "Exclusive", color: [198, 184, 96] },
  { key: "teal", label: "Deluxe", color: [62, 198, 185] },
  { key: "blue", label: "Select", color: [117, 183, 242] },
  { key: "brown", label: "Standard", color: [184, 149, 112] },
];

export default function ValorantInventory({ lztData, accountId, compact = false }: ValorantInventoryProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("skins");
  const [skins, setSkins] = useState<EnrichedSkin[]>([]);
  const [agents, setAgents] = useState<EnrichedAgent[]>([]);
  const [buddies, setBuddies] = useState<EnrichedBuddy[]>([]);
  const [totals, setTotals] = useState({ skins: 0, agents: 0, buddies: 0 });
  const [loading, setLoading] = useState(true);
  const [rarityFilter, setRarityFilter] = useState("all");

  useEffect(() => {
    if (!accountId || !lztData?.valorantInventory) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchEdgeJson(
          `${SUPABASE_URL}/functions/v1/valorant-inventory?account_id=${accountId}`,
          { retries: 3, retryDelayMs: 600 }
        );
        setSkins(data.skins || []);
        setAgents(data.agents || []);
        setBuddies(data.buddies || []);
        setTotals({
          skins: data.totalSkins || 0,
          agents: data.totalAgents || 0,
          buddies: data.totalBuddies || 0,
        });
        if (data.skins?.length > 0) setActiveTab("skins");
        else if (data.agents?.length > 0) setActiveTab("agents");
        else if (data.buddies?.length > 0) setActiveTab("buddies");
      } catch (err) {
        console.error("Failed to load valorant inventory:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accountId, lztData]);

  const hasSkins = totals.skins > 0 || skins.length > 0;
  const hasAgents = totals.agents > 0 || agents.length > 0;
  const hasBuddies = totals.buddies > 0 || buddies.length > 0;

  const filteredSkins = useMemo(() => {
    if (rarityFilter === "all") return skins;
    return skins.filter(s => s.tier.key === rarityFilter);
  }, [skins, rarityFilter]);

  const rarityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of skins) {
      counts[s.tier.key] = (counts[s.tier.key] || 0) + 1;
    }
    return counts;
  }, [skins]);

  const rarityIcons = useMemo(() => {
    const icons: Record<string, string> = {};
    for (const s of skins) {
      if (s.tierIcon && !icons[s.tier.key]) {
        icons[s.tier.key] = s.tierIcon;
      }
    }
    return icons;
  }, [skins]);

  if (!lztData?.valorantInventory) return null;
  if (!hasSkins && !hasAgents && !hasBuddies && !loading) return null;

  const items = activeTab === "skins" ? filteredSkins : activeTab === "agents" ? agents : buddies;

  const tabs: { key: TabKey; label: string; count: number; icon: any }[] = [
    ...(hasSkins ? [{ key: "skins" as TabKey, label: "Skins", count: totals.skins || skins.length, icon: Crosshair }] : []),
    ...(hasAgents ? [{ key: "agents" as TabKey, label: "Agentes", count: totals.agents || agents.length, icon: Users }] : []),
    ...(hasBuddies ? [{ key: "buddies" as TabKey, label: "Chaveiros", count: totals.buddies || buddies.length, icon: Sparkles }] : []),
  ];

  const getGridCols = () => {
    if (compact) return "grid-cols-3 sm:grid-cols-4";
    if (activeTab === "buddies") return "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6";
    if (activeTab === "skins") return "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5";
    return "grid-cols-3 sm:grid-cols-4 md:grid-cols-5";
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-xs font-medium transition-all ${
              activeTab === tab.key
                ? "bg-primary/10 text-primary border border-primary/30"
                : "bg-muted/10 text-muted-foreground border border-border/20 hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] font-bold">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Rarity Filter - only for skins tab */}
      {activeTab === "skins" && skins.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {RARITY_FILTERS.map(({ key, label, color }) => {
            const count = key === "all" ? skins.length : (rarityCounts[key] || 0);
            if (key !== "all" && count === 0) return null;
            const isActive = rarityFilter === key;
            return (
              <button
                key={key}
                onClick={() => setRarityFilter(key)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-all border ${
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/20 bg-muted/5 text-muted-foreground hover:bg-muted/15 hover:text-foreground"
                }`}
              >
                {key !== "all" && rarityIcons[key] ? (
                  <img src={rarityIcons[key]} alt={label} className="h-3.5 w-3.5 shrink-0 drop-shadow-sm" />
                ) : key !== "all" && color ? (
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: `rgb(${color.join(",")})` }} />
                ) : null}
                <span>{label}</span>
                <span className="text-[9px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-muted/10 border border-border/20" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${rarityFilter}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className={`grid gap-2.5 ${getGridCols()}`}
          >
            {items.map((item: any, i: number) => {
              const tier = item.tier;
              const tileColor = tier ? `rgb(${tier.tile[0]}, ${tier.tile[1]}, ${tier.tile[2]})` : undefined;
              const outlineColor = tier ? `rgb(${tier.outline[0]}, ${tier.outline[1]}, ${tier.outline[2]})` : undefined;
              const rawImageSrc = activeTab === "agents" ? (item.fullPortrait || item.icon) : item.icon;
              const tierIconSrc = item.tierIcon;

              return (
                <motion.div
                  key={item.uuid + i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4), duration: 0.25 }}
                  className="group/tile relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.04]"
                  style={{
                    background: tileColor
                      ? `linear-gradient(135deg, ${tileColor}, rgba(0,0,0,0.6))`
                      : undefined,
                    border: outlineColor ? `1.5px solid ${outlineColor}40` : "1px solid hsl(var(--border))",
                    boxShadow: outlineColor
                      ? `0 0 12px ${outlineColor}20, inset 0 0 20px rgba(0,0,0,0.3)`
                      : undefined,
                  }}
                >
                  <div className={`flex items-center justify-center overflow-hidden ${
                    activeTab === "buddies" ? "aspect-square p-3" : activeTab === "skins" ? "aspect-square p-2" : "aspect-[3/4] p-1"
                  }`}>
                    {rawImageSrc ? (
                      <img
                        src={rawImageSrc}
                        alt={item.name}
                        className="h-full w-full object-contain transition-transform duration-500 group-hover/tile:scale-110 drop-shadow-lg"
                        loading="lazy"
                        style={{
                          filter: activeTab === "skins"
                            ? "brightness(1.14) contrast(1.28) saturate(1.9) hue-rotate(-6deg)"
                            : activeTab === "buddies"
                            ? "brightness(1.1) saturate(1.25) contrast(1.05)"
                            : undefined,
                        }}
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground">{item.name}</div>
                    )}
                  </div>

                  {tierIconSrc && (
                    <div className="absolute top-1.5 right-1.5">
                      <img src={tierIconSrc} alt="" className="h-4 w-4 drop-shadow-md" />
                    </div>
                  )}

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
      ) : activeTab === "skins" && rarityFilter !== "all" ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhuma skin encontrada com este filtro.
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhum item encontrado.
        </div>
      )}
    </div>
  );
}
