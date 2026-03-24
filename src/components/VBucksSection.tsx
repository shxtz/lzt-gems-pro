import { motion } from "framer-motion";
import { Zap, ShoppingBag } from "lucide-react";
import vbucksIcon from "@/assets/vbucks-icon.png";

interface VBucksCardProps {
  amount: number;
  price: number;
  popular?: boolean;
  index: number;
}

const VBucksCard = ({ amount, price, popular, index }: VBucksCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative"
    >
      {popular && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-20"
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 + 0.3, type: "spring" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-gold px-4 py-1.5 font-display text-[9px] font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-gold">
            <Zap className="h-3 w-3" />
            Mais Popular
          </span>
        </motion.div>
      )}

      <div
        className={`relative overflow-hidden rounded-2xl transition-all duration-500 ${
          popular
            ? "border border-primary/30 shadow-gold-intense"
            : "border border-border/40 hover:border-primary/20"
        }`}
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-card" />
        {popular && (
          <div className="absolute inset-0" style={{ background: "var(--gradient-radial-gold)" }} />
        )}
        {/* Scanline overlay */}
        <div className="absolute inset-0 scanlines" />

        <div className="relative z-10 p-7 text-center">
          {/* Amount */}
          <div className="mb-1">
            <span className="font-display text-3xl md:text-4xl font-black text-gradient-gold">
              {amount.toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="font-body text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-6">
            V-Bucks
          </div>

          {/* Divider */}
          <div className="mx-auto mb-6 h-[1px] w-12 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          {/* Price */}
          <div className="mb-7">
            <span className="font-body text-[11px] text-muted-foreground line-through mr-2">
              R${(price * 1.3).toFixed(2).replace(".", ",")}
            </span>
            <br />
            <span className="font-display text-2xl md:text-3xl font-bold text-foreground">
              R${price.toFixed(2).replace(".", ",")}
            </span>
          </div>

          {/* Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`group/btn relative w-full overflow-hidden rounded-xl py-3.5 font-display text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
              popular
                ? "bg-gradient-gold text-primary-foreground shadow-gold"
                : "glass-gold text-foreground hover:shadow-gold"
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <ShoppingBag className="h-3.5 w-3.5" />
              Comprar
            </span>
            {/* Hover shimmer */}
            <div className="absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/btn:translate-x-full"
              style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.1), transparent)" }}
            />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

const vbucksOptions = [
  { amount: 1000, price: 12.90 },
  { amount: 2800, price: 29.90 },
  { amount: 5000, price: 49.90, popular: true },
  { amount: 13500, price: 119.90 },
];

const VBucksSection = () => {
  return (
    <section className="py-28 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full"
          style={{ background: "radial-gradient(ellipse, hsl(43 84% 55% / 0.04), transparent 60%)" }}
        />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-block font-body text-[10px] text-primary uppercase tracking-[0.3em] mb-4"
          >
            ⬡ Pacotes Disponíveis
          </motion.span>
          <h2 className="font-display text-4xl md:text-5xl font-black mb-4 tracking-tight">
            <span className="text-gradient-gold-shine">V-BUCKS</span>
          </h2>
          <p className="font-body text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Escolha a quantidade e receba instantaneamente na sua conta Fortnite.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 max-w-5xl mx-auto">
          {vbucksOptions.map((opt, i) => (
            <motion.div
              key={opt.amount}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <VBucksCard {...opt} index={i} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VBucksSection;
