import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crosshair, Users, KeyRound, Loader2, Filter } from "lucide-react";
import { enrichValorantInventory, type EnrichedInventory, type ValorantSkin, TIER_STYLES } from "@/lib/valorant-api";

interface ValorantInventoryProps {
  lztData: any;
  compact?: boolean;
}

type TabKey = "skins" | "agents" | "buddies";

const TABS: { key: TabKey; label: string; Icon: any }[] = [
  { key: "skins", label: "Skins", Icon: Crosshair },
  { key: "agents", label: "Agentes", Icon: Users },
  { key: "buddies", label: "Chaveiros", Icon: KeyRound },
];

const RARITY_FILTERS = [
  { key: "all", label: "Todas", color: null },
  { key: "orange", label: "Ultra", color: [250, 214, 99] },
  { key: "purple", label: "Premium", color: [205, 124, 191] },
  { key: "gold", label: "Exclusive", color: [198, 184, 96] },
  { key: "teal", label: "Deluxe", color: [0, 149, 115] },
  { key: "green", label: "Select", color: [90, 159, 98] },
  { key: "gray", label: "Standard", color: [120, 120, 120] },
];

function SkinTile({ skin, index }: { skin: ValorantSkin; index: number }) {
  const { tile, outline } = skin.tier;
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: Math.min(index * 0.02, 0.4), duration: 0.25 }}
      className="group/tile relative aspect-square rounded-xl overflow-hidden cursor-pointer"
      style={{
        background: `linear-gradient(135deg, rgba(${tile.join(",")}, 0.95), rgba(${tile.join(",")}, 0.4))`,
        border: `1px solid rgba(${outline.join(",")}, 0.5)`,
      }}
      title={skin.displayName}
    >
      {!imgError && skin.displayIcon ? (
        <img
          src={skin.displayIcon}
          alt={skin.displayName}
          loading="lazy"
          onError={() => setImgError(true)}
          className="w-full h-full object-contain p-2 saturate-[1.8] brightness-110 drop-shadow-lg group-hover/tile:scale-110 transition-transform duration-300"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Crosshair className="h-5 w-5 text-white/20" />
        </div>
      )}
      <div className="absolute top-1.5 right-1.5">
        <span style={{ color: `rgba(${outline.join(",")}, 0.9)` }} className="text-[10px]">◆</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent opacity-0 group-hover/tile:opacity-100 transition-opacity duration-200 p-2 pt-5">
        <p className="text-[9px] text-white/90 font-medium truncate text-center leading-tight">{skin.displayName}</p>
        <p className="text-[8px] mt-0.5 text-center font-medium" style={{ color: `rgba(${outline.join(",")}, 0.9)` }}>{skin.tier.label}</p>
      </div>
    </motion.div>
  );
}

export default function ValorantInventory({ lztData, compact = false }: ValorantInventoryProps) {
  const [inventory, setInventory] = useState<EnrichedInventory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("skins");
  const [rarityFilter, setRarityFilter] = useState("all");

  const valorantInventory = lztData?.valorantInventory;

  useEffect(() => {
    if (!valorantInventory || typeof valorantInventory !== "object") return;
    setLoading(true);
    setError(false);
    enrichValorantInventory(valorantInventory)
      .then(setInventory)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [valorantInventory]);

  const tabCounts = useMemo(() => ({
    skins: inventory?.totalSkins || 0,
    agents: inventory?.totalAgents || 0,
    buddies: inventory?.totalBuddies || 0,
  }), [inventory]);

  const filteredSkins = useMemo(() => {
    if (!inventory) return [];
    if (rarityFilter === "all") return inventory.skins;
    return inventory.skins.filter(s => s.tier.key === rarityFilter);
  }, [inventory, rarityFilter]);

  const rarityCounts = useMemo(() => {
    if (!inventory) return {};
    const counts: Record<string, number> = {};
    for (const s of inventory.skins) {
      counts[s.tier.key] = (counts[s.tier.key] || 0) + 1;
    }
    return counts;
  }, [inventory]);

  if (!valorantInventory || typeof valorantInventory !== "object") return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando inventário...</span>
      </div>
    );
  }

  if (error || !inventory) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Não foi possível carregar o inventário.
      </div>
    );
  }

  const gridCols = compact
    ? "grid-cols-3 sm:grid-cols-4"
    : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6";

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-muted/10 rounded-xl p-1 border border-border/20">
        {TABS.map(({ key, label, Icon }) => {
          const count = tabCounts[key];
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 px-3 text-xs font-medium transition-all ${
                isActive
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{label}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Rarity Filter - only for skins tab */}
      {activeTab === "skins" && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          {RARITY_FILTERS.map(({ key, label, color }) => {
            const count = key === "all" ? inventory.totalSkins : (rarityCounts[key] || 0);
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
                {color && (
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: `rgb(${color.join(",")})` }} />
                )}
                <span>{label}</span>
                <span className="text-[9px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "skins" && (
          <motion.div
            key={`skins-${rarityFilter}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {filteredSkins.length > 0 ? (
              <div className={`grid ${gridCols} gap-2`}>
                {filteredSkins.map((skin, i) => (
                  <SkinTile key={skin.uuid} skin={skin} index={i} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhuma skin encontrada com este filtro.
              </div>
            )}
          </motion.div>
        )}

        {activeTab === "agents" && (
          <motion.div
            key="agents"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2"
          >
            {inventory.agents.map((agent, i) => (
              <motion.div
                key={agent.uuid}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.05, 0.5) }}
                className="group/tile relative aspect-square rounded-xl overflow-hidden bg-muted/10 border border-border/20"
                title={agent.displayName}
              >
                <img
                  src={agent.bustPortrait || agent.fullPortrait || agent.displayIcon}
                  alt={agent.displayName}
                  loading="lazy"
                  className="w-full h-full object-cover object-top saturate-[1.4] brightness-105 group-hover/tile:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 pt-6">
                  <p className="text-[10px] text-white/90 font-medium truncate text-center">{agent.displayName}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {activeTab === "buddies" && (
          <motion.div
            key="buddies"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2"
          >
            {inventory.buddies.map((buddy, i) => (
              <motion.div
                key={buddy.uuid}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: Math.min(i * 0.03, 0.5) }}
                className="group/tile relative aspect-square rounded-xl overflow-hidden bg-muted/10 border border-border/20 flex items-center justify-center"
                title={buddy.displayName}
              >
                <img
                  src={buddy.displayIcon}
                  alt={buddy.displayName}
                  loading="lazy"
                  className="w-3/4 h-3/4 object-contain saturate-[1.4] brightness-110 group-hover/tile:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover/tile:opacity-100 transition-opacity p-1.5 pt-4">
                  <p className="text-[8px] text-white/90 font-medium truncate text-center">{buddy.displayName}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
