import { motion } from "framer-motion";
import { Zap } from "lucide-react";

interface VBucksCardProps {
  amount: number;
  price: number;
  popular?: boolean;
}

const VBucksCard = ({ amount, price, popular }: VBucksCardProps) => {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      className={`relative rounded-2xl p-[1px] transition-all ${
        popular ? "bg-gradient-to-b from-primary/60 to-primary/10 shadow-gold" : "bg-gradient-to-b from-border to-transparent"
      }`}
    >
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <span className="inline-flex items-center gap-1 rounded-full bg-gradient-gold px-3 py-1 font-display text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
            <Zap className="h-3 w-3" />
            Popular
          </span>
        </div>
      )}
      <div className="bg-gradient-card rounded-2xl p-6 text-center h-full">
        <div className="font-display text-4xl font-bold text-gradient-gold mb-1">
          {amount.toLocaleString("pt-BR")}
        </div>
        <div className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-5">
          V-Bucks
        </div>
        <div className="mb-5">
          <span className="font-display text-3xl font-bold text-foreground">
            R${price.toFixed(2).replace(".", ",")}
          </span>
        </div>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          className={`w-full rounded-xl py-3 font-display text-sm font-bold uppercase tracking-wider transition-all ${
            popular
              ? "bg-gradient-gold text-primary-foreground shadow-gold"
              : "border border-border text-foreground hover:border-primary/40 hover:bg-muted"
          }`}
        >
          Comprar
        </motion.button>
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
    <section className="py-24 relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-3">
            <span className="text-gradient-gold">V-BUCKS</span>
          </h2>
          <p className="font-body text-muted-foreground max-w-md mx-auto">
            Escolha a quantidade de V-Bucks e receba instantaneamente na sua conta.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
          {vbucksOptions.map((opt, i) => (
            <motion.div
              key={opt.amount}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <VBucksCard {...opt} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VBucksSection;
