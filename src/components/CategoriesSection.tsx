import { motion } from "framer-motion";
import { Gamepad2, Swords, Flame, Star, Sparkles, Shield, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  name: string;
  icon: LucideIcon;
  count: number;
  gradient: string;
  index: number;
}

const CategoryCard = ({ name, icon: Icon, count, gradient, index }: CategoryCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative cursor-pointer"
    >
      <div className="relative overflow-hidden rounded-2xl border border-border/30 bg-gradient-card transition-all duration-500 hover:border-primary/25 hover:shadow-card-hover">
        {/* Hover glow */}
        <div
          className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{ background: gradient }}
        />

        <div className="relative z-10 p-6 md:p-7">
          <div className="flex items-start justify-between mb-5">
            <motion.div
              whileHover={{ rotate: [0, -5, 5, 0] }}
              className="inline-flex rounded-xl glass-gold p-3"
            >
              <Icon className="h-5 w-5 text-primary" />
            </motion.div>
            <div className="opacity-0 transition-all duration-300 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
              <ArrowUpRight className="h-4 w-4 text-primary" />
            </div>
          </div>

          <h3 className="font-display text-[13px] md:text-sm font-bold text-foreground mb-1.5 tracking-wide uppercase">
            {name}
          </h3>
          <p className="font-body text-[11px] text-muted-foreground tracking-wide">
            {count} contas disponíveis
          </p>

          {/* Bottom bar */}
          <div className="mt-5 h-[2px] w-0 bg-gradient-gold rounded-full transition-all duration-500 group-hover:w-full" />
        </div>
      </div>
    </motion.div>
  );
};

const categories = [
  { name: "Valorant", icon: Swords, count: 142, gradient: "radial-gradient(ellipse at top left, hsl(0 80% 50% / 0.06), transparent 60%)" },
  { name: "Fortnite", icon: Gamepad2, count: 89, gradient: "radial-gradient(ellipse at top left, hsl(43 84% 55% / 0.06), transparent 60%)" },
  { name: "League of Legends", icon: Shield, count: 67, gradient: "radial-gradient(ellipse at top left, hsl(43 60% 45% / 0.06), transparent 60%)" },
  { name: "Genshin Impact", icon: Star, count: 45, gradient: "radial-gradient(ellipse at top left, hsl(210 80% 60% / 0.06), transparent 60%)" },
  { name: "Honkai: Star Rail", icon: Sparkles, count: 33, gradient: "radial-gradient(ellipse at top left, hsl(270 60% 65% / 0.06), transparent 60%)" },
  { name: "Brawl Stars", icon: Flame, count: 28, gradient: "radial-gradient(ellipse at top left, hsl(30 90% 50% / 0.06), transparent 60%)" },
];

const CategoriesSection = () => {
  return (
    <section className="py-28 relative overflow-hidden">
      {/* Section divider */}
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

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 max-w-4xl mx-auto">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <CategoryCard {...cat} index={i} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
