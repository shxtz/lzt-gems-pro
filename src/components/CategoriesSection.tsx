import { motion } from "framer-motion";
import { Gamepad2, Swords, Flame, Star, Sparkles, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CategoryCardProps {
  name: string;
  icon: LucideIcon;
  count: number;
  color: string;
}

const CategoryCard = ({ name, icon: Icon, count, color }: CategoryCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      className="group relative cursor-pointer rounded-2xl border border-border/50 bg-gradient-card p-6 transition-all hover:border-primary/30 hover:shadow-gold"
    >
      <div
        className="mb-4 inline-flex rounded-xl p-3 transition-colors"
        style={{ backgroundColor: `${color}15`, color }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-lg font-bold text-foreground mb-1">{name}</h3>
      <p className="font-body text-xs text-muted-foreground">
        {count} contas disponíveis
      </p>
      <div className="absolute top-4 right-4 font-body text-[10px] font-medium uppercase tracking-wider text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        Ver →
      </div>
    </motion.div>
  );
};

const categories = [
  { name: "Valorant", icon: Swords, count: 142, color: "#ff4654" },
  { name: "Fortnite", icon: Gamepad2, count: 89, color: "#ecb32c" },
  { name: "League of Legends", icon: Shield, count: 67, color: "#c89b3c" },
  { name: "Genshin Impact", icon: Star, count: 45, color: "#6eb4ff" },
  { name: "Honkai: Star Rail", icon: Sparkles, count: 33, color: "#c090ff" },
  { name: "Brawl Stars", icon: Flame, count: 28, color: "#ff8c00" },
];

const CategoriesSection = () => {
  return (
    <section className="py-24 border-t border-border/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-3 text-foreground">
            CATEGORIAS
          </h2>
          <p className="font-body text-muted-foreground max-w-md mx-auto">
            Contas verificadas dos melhores jogos com entrega automática.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <CategoryCard {...cat} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
