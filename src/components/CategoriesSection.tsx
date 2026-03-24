import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

import valorantImg from "@/assets/categories/valorant.png";
import fortniteImg from "@/assets/categories/fortnite.png";
import genshinImg from "@/assets/categories/genshin.png";
import lolImg from "@/assets/categories/lol.png";
import honkaiImg from "@/assets/categories/honkai.png";
import minecraftImg from "@/assets/categories/minecraft.png";
import steamImg from "@/assets/categories/steam.png";
import zzzImg from "@/assets/categories/zzz.png";

const categories = [
  { name: "Valorant", image: valorantImg, slug: "valorant" },
  { name: "Fortnite", image: fortniteImg, slug: "fortnite" },
  { name: "Genshin Impact", image: genshinImg, slug: "genshin" },
  { name: "League of Legends", image: lolImg, slug: "lol" },
  { name: "Honkai: Star Rail", image: honkaiImg, slug: "honkai" },
  { name: "Minecraft", image: minecraftImg, slug: "minecraft" },
  { name: "Steam", image: steamImg, slug: "steam" },
  { name: "Zenless Zone Zero", image: zzzImg, slug: "zzz" },
];

const CategoriesSection = () => {
  const navigate = useNavigate();

  return (
    <section id="categories" className="py-28 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block font-body text-[10px] text-primary uppercase tracking-[0.3em] mb-4">
            ⬡ Explore
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-black mb-4 text-foreground tracking-tight">
            CATEGORIAS
          </h2>
          <p className="font-body text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Contas verificadas dos melhores jogos com entrega automática.
          </p>
        </motion.div>

        {/* Top row - 5 items */}
        <div className="flex justify-center gap-4 md:gap-6 mb-4 md:mb-6 flex-wrap">
          {categories.slice(0, 5).map((cat, i) => (
            <CategoryIcon key={cat.slug} category={cat} index={i} onClick={() => navigate(`/contas/${cat.slug}`)} />
          ))}
        </div>

        {/* Bottom row - 3 items centered */}
        <div className="flex justify-center gap-4 md:gap-6 flex-wrap">
          {categories.slice(5).map((cat, i) => (
            <CategoryIcon key={cat.slug} category={cat} index={i + 5} onClick={() => navigate(`/contas/${cat.slug}`)} />
          ))}
        </div>
      </div>
    </section>
  );
};

interface CategoryIconProps {
  category: { name: string; image: string; slug: string };
  index: number;
  onClick: () => void;
}

const CategoryIcon = ({ category, index, onClick }: CategoryIconProps) => {
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
        className="relative w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-2xl overflow-hidden border border-border/30 bg-card/80 backdrop-blur-sm flex items-center justify-center transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)]"
      >
        <img
          src={category.image}
          alt={category.name}
          loading="lazy"
          width={512}
          height={512}
          className="w-[52px] h-[52px] md:w-[60px] md:h-[60px] object-contain transition-transform duration-300 group-hover:scale-110"
        />
      </motion.div>
      <span className="mt-2 text-[11px] md:text-xs font-display text-muted-foreground group-hover:text-foreground transition-colors duration-300 text-center max-w-[88px] leading-tight opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all">
        {category.name}
      </span>
    </motion.div>
  );
};

export default CategoriesSection;
