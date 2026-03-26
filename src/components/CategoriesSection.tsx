import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import valorantImg from "@/assets/categories/valorant.png";
import smurfImg from "@/assets/categories/valorant-smurfs.png";
import fortniteImg from "@/assets/categories/fortnite.png";
import genshinImg from "@/assets/categories/genshin.png";
import lolImg from "@/assets/categories/lol.png";
import honkaiImg from "@/assets/categories/honkai.png";
import minecraftImg from "@/assets/categories/minecraft.png";
import steamImg from "@/assets/categories/steam.png";
import zzzImg from "@/assets/categories/zzz.png";

const SLUG_IMAGES: Record<string, string> = {
  valorant: valorantImg,
  "valorant-smurfs": smurfImg,
  fortnite: fortniteImg,
  genshin: genshinImg,
  lol: lolImg,
  honkai: honkaiImg,
  minecraft: minecraftImg,
  steam: steamImg,
  zzz: zzzImg,
};

interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  icon_url: string | null;
  sort_order: number;
}

const FALLBACK_HOME_CATEGORIES: ShopCategory[] = [
  { id: "fallback-valorant", name: "Valorant", slug: "valorant", emoji: "🎯", icon_url: null, sort_order: 1 },
  { id: "fallback-fortnite", name: "Fortnite", slug: "fortnite", emoji: "🪂", icon_url: null, sort_order: 2 },
  { id: "fallback-genshin", name: "Genshin Impact", slug: "genshin", emoji: "⭐", icon_url: null, sort_order: 3 },
  { id: "fallback-lol", name: "League of Legends", slug: "lol", emoji: "🏆", icon_url: null, sort_order: 4 },
  { id: "fallback-honkai", name: "Honkai Star Rail", slug: "honkai", emoji: "🚄", icon_url: null, sort_order: 5 },
  { id: "fallback-minecraft", name: "Minecraft", slug: "minecraft", emoji: "⛏️", icon_url: null, sort_order: 6 },
  { id: "fallback-steam", name: "Steam", slug: "steam", emoji: "🎮", icon_url: null, sort_order: 7 },
  { id: "fallback-zzz", name: "Zenless Zone Zero", slug: "zzz", emoji: "⚡", icon_url: null, sort_order: 8 },
];

const HOME_CATEGORY_CACHE_KEY = "shop-cache:home-categories";

const readCachedCategories = (): ShopCategory[] => {
  if (typeof window === "undefined") return FALLBACK_HOME_CATEGORIES;
  try {
    const raw = window.localStorage.getItem(HOME_CATEGORY_CACHE_KEY);
    return raw ? (JSON.parse(raw) as ShopCategory[]) : FALLBACK_HOME_CATEGORIES;
  } catch {
    return FALLBACK_HOME_CATEGORIES;
  }
};

const CategoriesSection = () => {
  const navigate = useNavigate();
  const { authReady } = useAuth();

  const { data: categories } = useQuery({
    queryKey: ["home-shop-categories"],
    enabled: authReady,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000,
    initialData: () => readCachedCategories(),
    queryFn: async () => {
      try {
        const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 8000));
        const { data, error } = await Promise.race([
          supabase
            .from("shop_categories")
            .select("id, name, slug, emoji, icon_url, sort_order")
            .eq("visible", true)
            .order("sort_order"),
          timeout,
        ]);
        if (error) throw error;
        const nextData = (data && data.length > 0 ? data : FALLBACK_HOME_CATEGORIES) as ShopCategory[];
        if (typeof window !== "undefined") {
          window.localStorage.setItem(HOME_CATEGORY_CACHE_KEY, JSON.stringify(nextData));
        }
        return nextData;
      } catch {
        return readCachedCategories();
      }
    },
  });

  const displayCategories = categories || FALLBACK_HOME_CATEGORIES;

  // Separate Fortnite from the rest
  const fortnite = displayCategories.find((c) => c.slug === "fortnite");
  const others = displayCategories.filter((c) => c.slug !== "fortnite");

  return (
    <section id="categories" className="py-20 sm:py-28 md:py-36 relative overflow-hidden">
      {/* Radial gold glow background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-[radial-gradient(ellipse_at_center,hsl(43_84%_55%/0.06),transparent_70%)]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,hsl(43_84%_55%/0.03),transparent_50%)]" />
        <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_right,hsl(30_90%_42%/0.04),transparent_50%)]" />
      </div>

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-[1px] bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
      <div className="absolute inset-0 pointer-events-none ember-bg opacity-50" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12 sm:mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-block font-body text-[10px] sm:text-[11px] text-primary uppercase tracking-[0.35em] mb-4 sm:mb-5 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5"
          >
            ⬡ Explore
          </motion.span>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl font-black mb-4 sm:mb-5 text-gradient-gold tracking-tight">
            CATEGORIAS
          </h2>
          <p className="font-body text-xs sm:text-sm text-muted-foreground max-w-sm sm:max-w-lg mx-auto leading-relaxed font-medium">
            Contas verificadas dos melhores jogos com entrega automática.
          </p>
        </motion.div>

        {/* ── FORTNITE FEATURED HERO CARD ── */}
        {fortnite && <FortniteFeaturedCard category={fortnite} onClick={() => navigate(`/contas/${fortnite.slug}`)} />}

        {/* ── OTHER CATEGORIES GRID ── */}
        <div className="flex justify-center gap-4 sm:gap-6 md:gap-8 flex-wrap mt-10 sm:mt-14">
          {others.map((cat, i) => (
            <CategoryIcon key={cat.id} category={cat} index={i} onClick={() => navigate(`/contas/${cat.slug}`)} />
          ))}
        </div>
      </div>
    </section>
  );
};

interface CategoryIconProps {
  category: ShopCategory;
  index: number;
  onClick: () => void;
}

const CategoryIcon = ({ category, index, onClick }: CategoryIconProps) => {
  const image = category.icon_url || SLUG_IMAGES[category.slug];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.85 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group relative cursor-pointer flex flex-col items-center"
      onClick={onClick}
    >
      <motion.div
        whileHover={{ y: -10, scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        className="relative w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] md:w-[100px] md:h-[100px] rounded-2xl overflow-hidden border border-border/20 bg-gradient-to-br from-card to-background backdrop-blur-md flex items-center justify-center transition-all duration-500 group-hover:border-primary/50 group-hover:shadow-[0_0_40px_-5px_hsl(var(--primary)/0.3),0_0_80px_-10px_hsl(var(--primary)/0.1)] group-hover:bg-gradient-to-br group-hover:from-primary/10 group-hover:to-card"
      >
        {/* Inner glow on hover */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_center,hsl(43_84%_55%/0.08),transparent_70%)]" />
        
        {image ? (
          <img
            src={image}
            alt={category.name}
            loading="lazy"
            className="relative z-10 w-[46px] h-[46px] sm:w-[56px] sm:h-[56px] md:w-[66px] md:h-[66px] object-contain transition-all duration-500 group-hover:scale-115 group-hover:drop-shadow-[0_0_12px_hsl(43_84%_55%/0.3)]"
          />
        ) : (
          <span className="relative z-10 text-2xl sm:text-3xl md:text-4xl transition-transform duration-300 group-hover:scale-110">{category.emoji || "📦"}</span>
        )}
      </motion.div>

      {/* Name label */}
      <span className="mt-2 sm:mt-3 text-[10px] sm:text-[11px] md:text-xs font-display font-bold text-muted-foreground group-hover:text-primary transition-all duration-400 text-center max-w-[80px] sm:max-w-[100px] leading-tight sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-2 sm:group-hover:translate-y-0">
        {category.name}
      </span>
    </motion.div>
  );
};

export default CategoriesSection;
