import { motion } from "framer-motion";
import { Shield, Zap, Headphones, CreditCard } from "lucide-react";

const features = [
  {
    icon: Zap,
    title: "Entrega Instantânea",
    description: "Receba suas credenciais automaticamente após a confirmação do pagamento.",
  },
  {
    icon: Shield,
    title: "100% Seguro",
    description: "Todas as contas são verificadas antes da venda. Garantia total.",
  },
  {
    icon: CreditCard,
    title: "Pagamento Fácil",
    description: "PIX, cartão e saldo interno. Diversas formas de pagamento.",
  },
  {
    icon: Headphones,
    title: "Suporte 24/7",
    description: "Equipe dedicada para te ajudar a qualquer momento.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 border-t border-border/30 relative">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center p-6"
            >
              <div className="mx-auto mb-4 inline-flex rounded-xl bg-primary/10 p-3 text-primary">
                <feat.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-2">
                {feat.title}
              </h3>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">
                {feat.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
