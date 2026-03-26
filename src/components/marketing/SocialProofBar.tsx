import { motion } from "framer-motion";
import { Users, Star, Shield, TrendingUp } from "lucide-react";

const stats = [
  { icon: Users, value: "1.000+", label: "Clientes ativos" },
  { icon: Star, value: "4.9/5", label: "Avaliação" },
  { icon: Shield, value: "100%", label: "Seguro" },
  { icon: TrendingUp, value: "2.000+", label: "Vendas realizadas" },
];

const SocialProofBar = () => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center justify-center gap-4 sm:gap-6 py-3 px-4 rounded-xl border border-border/20 bg-muted/10 mb-5"
  >
    {stats.map((s) => (
      <div key={s.label} className="flex items-center gap-1.5 text-muted-foreground">
        <s.icon className="h-3 w-3 text-primary" />
        <span className="font-display text-[10px] sm:text-xs font-bold text-foreground">{s.value}</span>
        <span className="hidden sm:inline font-body text-[10px] text-muted-foreground">{s.label}</span>
      </div>
    ))}
  </motion.div>
);

export default SocialProofBar;
