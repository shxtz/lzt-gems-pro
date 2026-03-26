import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Swords, Sparkles, ShoppingBag, Shield } from "lucide-react";

interface ItemDetailModalProps {
  item: {
    id: string;
    name: string;
    icon?: string | null;
    splash?: string | null;
    type?: string;
    rarity?: number | string;
    tier?: { key: string; name: string; color: number[]; bgColor: number[] };
    element?: string | null;
    weapon?: string | null;
    constellation?: number;
    eidolon?: number;
    path?: string | null;
    champion?: string;
    isShopItem?: boolean;
  } | null;
  gameTheme?: { primary: string; primaryRgb: string };
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  character: "Personagem",
  weapon: "Arma",
  lightcone: "Light Cone",
  skin: "Skin",
  champion: "Campeão",
  cape: "Capa",
  edition: "Edição",
  outfit: "Skin",
  pickaxe: "Picareta",
  emote: "Emote",
  glider: "Planador",
};

export default function ItemDetailModal({ item, gameTheme, onClose }: ItemDetailModalProps) {
  if (!item) return null;

  const tier = item.tier;
  const outlineColor = tier ? `rgb(${tier.color[0]}, ${tier.color[1]}, ${tier.color[2]})` : gameTheme?.primary || "hsl(var(--primary))";
  const bgColor = tier ? `rgb(${tier.bgColor[0]}, ${tier.bgColor[1]}, ${tier.bgColor[2]})` : undefined;
  const imageSrc = item.splash || item.icon;
  const typeLabel = TYPE_LABELS[item.type || ""] || item.type || "";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="relative w-full max-w-sm rounded-2xl border overflow-hidden"
          style={{
            borderColor: `${outlineColor}40`,
            background: `linear-gradient(145deg, ${bgColor || "hsl(var(--card))"}, hsl(var(--card)))`,
            boxShadow: `0 25px 60px -12px ${outlineColor}30, 0 0 40px ${outlineColor}10`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 rounded-full bg-background/60 backdrop-blur-md p-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Image */}
          <div className="relative aspect-square overflow-hidden flex items-center justify-center p-6">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                background: `radial-gradient(circle at 50% 40%, ${outlineColor}40, transparent 70%)`,
              }}
            />
            {imageSrc ? (
              <img
                src={imageSrc}
                alt={item.name}
                className="relative z-[1] max-h-full max-w-full object-contain drop-shadow-2xl"
                style={{ filter: "brightness(1.1) saturate(1.3)" }}
              />
            ) : (
              <Sparkles className="h-20 w-20 opacity-20" style={{ color: outlineColor }} />
            )}
          </div>

          {/* Info */}
          <div className="relative px-5 pb-5 space-y-3 border-t" style={{ borderColor: `${outlineColor}20` }}>
            {/* Tier badge */}
            <div className="flex items-center gap-2 -mt-3">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider shadow-lg"
                style={{
                  backgroundColor: outlineColor,
                  color: "#000",
                }}
              >
                {tier?.name || "Item"}
              </span>
              {item.isShopItem && (
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-blue-500 text-white shadow-lg">
                  <ShoppingBag className="h-3 w-3" />
                  Loja
                </span>
              )}
            </div>

            {/* Name */}
            <h3 className="text-lg font-display font-bold text-foreground leading-tight">
              {item.name}
            </h3>

            {/* Details grid */}
            <div className="flex flex-wrap gap-2">
              {typeLabel && (
                <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium border border-border/30 bg-muted/10 text-muted-foreground">
                  <Swords className="h-3 w-3" />
                  {typeLabel}
                </span>
              )}
              {item.element && (
                <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium border border-border/30 bg-muted/10 text-muted-foreground">
                  <Sparkles className="h-3 w-3" />
                  {item.element}
                </span>
              )}
              {item.weapon && (
                <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium border border-border/30 bg-muted/10 text-muted-foreground">
                  <Swords className="h-3 w-3" />
                  {item.weapon}
                </span>
              )}
              {item.path && (
                <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium border border-border/30 bg-muted/10 text-muted-foreground">
                  <Star className="h-3 w-3" />
                  {item.path}
                </span>
              )}
              {item.champion && (
                <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium border border-border/30 bg-muted/10 text-muted-foreground">
                  <Shield className="h-3 w-3" />
                  {item.champion}
                </span>
              )}
              {(item.constellation !== undefined && item.constellation > 0) && (
                <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: `${outlineColor}20`, color: outlineColor, border: `1px solid ${outlineColor}30` }}>
                  C{item.constellation}
                </span>
              )}
              {(item.eidolon !== undefined && item.eidolon > 0) && (
                <span className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: `${outlineColor}20`, color: outlineColor, border: `1px solid ${outlineColor}30` }}>
                  E{item.eidolon}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
