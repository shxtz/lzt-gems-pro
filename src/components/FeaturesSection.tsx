import { motion } from "framer-motion";
import { Shield, Zap, Headphones, CreditCard } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface FeatureProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

const FeatureCard = ({ icon: Icon, title, description, index }: FeatureProps) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -4 }}
    className="group relative text-center p-8 rounded-2xl border border-border/20 bg-gradient-card transition-all duration-500 hover:border-primary/20 hover:shadow-card-hover"
  >
    {/* Subtle glow on hover */}
    <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
      style={{ background: "radial-gradient(ellipse at center, hsl(43 84% 55% / 0.04), transparent 70%)" }}
    />

    <div className="relative z-10">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl glass-gold transition-all duration-300 group-hover:shadow-gold">
        <Icon className="h-5 w-5 text-primary transition-transform duration-300 group-hover:scale-110" />
      </div>
      <h3 className="font-display text-[13px] font-bold text-foreground mb-2 uppercase tracking-[0.1em]">
        {title}
      </h3>
      <p className="font-body text-[12px] text-muted-foreground leading-relaxed">
        {description}
      </p>
    </div>
  </motion.div>
);

const features = [
  {
    icon: Zap,
    title: "Entrega Instantânea",
    description: "Credenciais entregues automaticamente após a confirmação do pagamento.",
  },
  {
    icon: Shield,
    title: "100% Seguro",
    description: "Contas verificadas antes da venda. Garantia total na compra.",
  },
  {
    icon: CreditCard,
    title: "Pagamento Fácil",
    description: "PIX, cartão e saldo interno. Pague como preferir.",
  },
  {
    icon: Headphones,
    title: "Suporte 24/7",
    description: "Equipe dedicada para te ajudar a qualquer momento.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-28 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/15 to-transparent" />

      {/* Background accent */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, hsl(43 84% 55% / 0.03), transparent 60%)" }}
      />

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <span className="inline-block font-body text-[10px] text-primary uppercase tracking-[0.3em] mb-4">
            ⬡ Por que nos escolher
          </span>
          <h2 className="font-display text-4xl md:text-5xl font-black mb-4 text-foreground tracking-tight">
            VANTAGENS
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {features.map((feat, i) => (
            <FeatureCard key={feat.title} {...feat} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
