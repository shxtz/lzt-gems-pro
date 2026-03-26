import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
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

const CategoriesSection = () => {
  const navigate = useNavigate();
  const { authReady } = useAuth();

  const { data: categories } = useQuery({
    queryKey: ["home-shop-categories"],
    enabled: authReady,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_categories")
        .select("*")
        .eq("visible", true)
        .order("sort_order");
      if (error) throw error;
      return data as ShopCategory[];
    },
  });

  const displayCategories = categories || [];
  const topRow = displayCategories.slice(0, 5);
  const bottomRow = displayCategories.slice(5);

  return (
    <section id="categories" className="py-16 sm:py-24 md:py-28 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <span className="inline-block font-body text-[10px] text-primary uppercase tracking-[0.3em] mb-3 sm:mb-4">
            ⬡ Explore
          </span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black mb-3 sm:mb-4 text-foreground tracking-tight">
            CATEGORIAS
          </h2>
          <p className="font-body text-xs sm:text-sm text-muted-foreground max-w-sm sm:max-w-md mx-auto leading-relaxed">
            Contas verificadas dos melhores jogos com entrega automática.
          </p>
        </motion.div>

        {/* Top row */}
        <div className="flex justify-center gap-3 sm:gap-4 md:gap-6 mb-3 sm:mb-4 md:mb-6 flex-wrap">
          {topRow.map((cat, i) => (
            <CategoryIcon key={cat.id} category={cat} index={i} onClick={() => navigate(`/contas/${cat.slug}`)} />
          ))}
        </div>

        {/* Bottom row */}
        {bottomRow.length > 0 && (
          <div className="flex justify-center gap-3 sm:gap-4 md:gap-6 flex-wrap">
            {bottomRow.map((cat, i) => (
              <CategoryIcon key={cat.id} category={cat} index={i + 5} onClick={() => navigate(`/contas/${cat.slug}`)} />
            ))}
          </div>
        )}
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
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="group relative cursor-pointer flex flex-col items-center"
      onClick={onClick}
    >
      <motion.div
        whileHover={{ y: -8, scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="relative w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] md:w-[88px] md:h-[88px] rounded-2xl overflow-hidden border border-border/30 bg-card/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)]"
      >
        {image ? (
          <img
            src={image}
            alt={category.name}
            loading="lazy"
            className="w-[42px] h-[42px] sm:w-[52px] sm:h-[52px] md:w-[60px] md:h-[60px] object-contain transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <span className="text-2xl sm:text-3xl md:text-4xl">{category.emoji || "📦"}</span>
        )}
      </motion.div>
      {/* Always show name on mobile, hover-reveal on desktop */}
      <span className="mt-1.5 sm:mt-2 text-[10px] sm:text-[11px] md:text-xs font-display text-muted-foreground group-hover:text-foreground transition-all duration-300 text-center max-w-[72px] sm:max-w-[88px] leading-tight sm:opacity-0 sm:group-hover:opacity-100 sm:translate-y-1 sm:group-hover:translate-y-0">
        {category.name}
      </span>
    </motion.div>
  );
};

export default CategoriesSection;
