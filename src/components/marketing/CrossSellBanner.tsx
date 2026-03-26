import { motion } from "framer-motion";
import { ArrowRight, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import vbucksIcon from "@/assets/vbucks-icon.png";

interface CrossSellBannerProps {
  /** Which page the user is currently on — adjusts the offer */
  context: "shop" | "preview" | "checkout";
}

const CrossSellBanner = ({ context }: CrossSellBannerProps) => {
  const navigate = useNavigate();

  if (context === "shop" || context === "preview") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        onClick={() => navigate("/vbucks")}
        className="cursor-pointer rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-4 sm:p-5 flex items-center gap-4 hover:border-primary/40 hover:shadow-gold transition-all group"
      >
        <div className="relative shrink-0">
          <img src={vbucksIcon} alt="V-Bucks" className="h-12 w-12 sm:h-14 sm:w-14 drop-shadow-lg group-hover:scale-110 transition-transform" />
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-2 -right-2 flex items-center justify-center h-7 w-7 rounded-full bg-gradient-gold shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
          >
            <span className="font-display text-[9px] font-black text-primary-foreground leading-none">-60%</span>
          </motion.div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Zap className="h-3 w-3 text-primary" />
            <span className="font-display text-[10px] font-bold text-primary uppercase tracking-wider">Oferta Especial</span>
          </div>
          <p className="font-display text-sm sm:text-base font-bold text-foreground">V-Bucks com até 62% OFF</p>
          <p className="font-body text-[10px] sm:text-xs text-muted-foreground">Preços até 62% mais baratos que a loja oficial do Fortnite</p>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
      </motion.div>
    );
  }

  // Checkout context — suggest accounts
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      onClick={() => navigate("/loja")}
      className="cursor-pointer rounded-2xl border border-border/30 bg-muted/10 p-4 flex items-center gap-3 hover:border-primary/30 transition-all group"
    >
      <div className="flex-1 min-w-0">
        <p className="font-display text-xs font-bold text-foreground">🎮 Quer uma conta completa?</p>
        <p className="font-body text-[10px] text-muted-foreground">Contas verificadas de Fortnite, Valorant, LoL e mais</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-all shrink-0" />
    </motion.div>
  );
};

export default CrossSellBanner;
