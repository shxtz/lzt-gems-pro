import { motion } from "framer-motion";
import { Zap, ShoppingBag, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import vbucksIcon from "@/assets/vbucks-icon.png";
import { AnimatePresence } from "framer-motion";

interface VBucksCardProps {
  id: string;
  amount: number;
  price: number;
  originalPrice?: number | null;
  popular?: boolean;
  index: number;
}

const VBucksCard = ({ id, amount, price, originalPrice, popular, index }: VBucksCardProps) => {
  const [showContact, setShowContact] = useState(false);

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
        <div className="absolute inset-0 bg-gradient-card" />
        {popular && (
          <div className="absolute inset-0" style={{ background: "var(--gradient-radial-gold)" }} />
        )}
        <div className="absolute inset-0 scanlines" />

        <div className="relative z-10 p-7 text-center">
          <div className="mb-1 flex items-center justify-center gap-2">
            <img src={vbucksIcon} alt="V-Bucks" className="h-10 w-10" />
            <span className="font-display text-3xl md:text-4xl font-black text-gradient-gold">
              {amount.toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="font-body text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-6">
            V-Bucks
          </div>

          <div className="mx-auto mb-6 h-[1px] w-12 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="mb-7">
            {originalPrice && (
              <>
                <span className="font-body text-[11px] text-muted-foreground line-through mr-2">
                  R${Number(originalPrice).toFixed(2).replace(".", ",")}
                </span>
                <br />
              </>
            )}
            <span className="font-display text-2xl md:text-3xl font-bold text-foreground">
              R${price.toFixed(2).replace(".", ",")}
            </span>
          </div>

          <AnimatePresence mode="wait">
            {!showContact ? (
              <motion.button
                key="buy"
                onClick={() => setShowContact(true)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
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
                <div className="absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/btn:translate-x-full"
                  style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.1), transparent)" }}
                />
              </motion.button>
            ) : (
              <motion.div
                key="contact"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex gap-2"
              >
                <a
                  href="https://discord.gg/vbucksbarato"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-[#5865F2] py-3 font-display text-[10px] font-bold uppercase tracking-[0.15em] text-white hover:bg-[#4752C4] transition-colors"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z"/>
                  </svg>
                  Discord
                </a>
                <a
                  href="https://wa.me/5518991175724?text=Quero%20saber%20mais%20sobre%20a%20compra%20de%20V-Bucks"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366]/20 border border-[#25D366]/30 py-3 px-3 font-display text-[10px] font-bold uppercase tracking-[0.15em] text-[#25D366] hover:bg-[#25D366]/30 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

const fallbackOptions = [
  { id: "1", amount: 1000, price: 12.90, original_price: 16.77, popular: false },
  { id: "2", amount: 2800, price: 29.90, original_price: 38.87, popular: false },
  { id: "3", amount: 5000, price: 49.90, original_price: 64.87, popular: true },
  { id: "4", amount: 13500, price: 119.90, original_price: 155.87, popular: false },
];

const VBucksSection = () => {
  const { data: products } = useQuery({
    queryKey: ["vbucks-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vbucks_products")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const displayProducts = products && products.length > 0 ? products : fallbackOptions;

  return (
    <section className="py-28 relative overflow-hidden">
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
          {displayProducts.map((opt, i) => (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <VBucksCard
                id={opt.id}
                amount={opt.amount}
                price={Number(opt.price)}
                originalPrice={opt.original_price}
                popular={opt.popular ?? false}
                index={i}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default VBucksSection;
