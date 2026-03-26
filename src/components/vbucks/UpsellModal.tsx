import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, ArrowRight, TrendingUp, Clock, Gift, ShieldCheck } from "lucide-react";
import vbucksIcon from "@/assets/vbucks-icon.png";
import whatsappIcon from "@/assets/whatsapp-icon.svg";
import { useNavigate } from "react-router-dom";

interface VBucksProduct {
  id: string;
  amount: number;
  price: number;
  original_price?: number | null;
  popular?: boolean;
}

interface UpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedProduct: VBucksProduct;
  allProducts: VBucksProduct[];
}

const UpsellModal = ({ isOpen, onClose, selectedProduct, allProducts }: UpsellModalProps) => {
  const navigate = useNavigate();

  // Find a bigger upsell product (next tier up)
  const sortedProducts = [...allProducts].sort((a, b) => a.amount - b.amount);
  const currentIndex = sortedProducts.findIndex((p) => p.id === selectedProduct.id);
  const upsellProduct = currentIndex < sortedProducts.length - 1 ? sortedProducts[currentIndex + 1] : null;

  // Calculate savings per VBuck for upsell
  const selectedPricePerVBuck = selectedProduct.price / selectedProduct.amount;
  const upsellPricePerVBuck = upsellProduct ? upsellProduct.price / upsellProduct.amount : 0;
  const savingsPercent = upsellProduct
    ? Math.round((1 - upsellPricePerVBuck / selectedPricePerVBuck) * 100)
    : 0;

  const buildWhatsAppUrl = (product: VBucksProduct) =>
    `https://wa.me/5518991175724?text=${encodeURIComponent(
      `Olá! Quero comprar ${product.amount.toLocaleString("pt-BR")} V-Bucks por R$${product.price.toFixed(2).replace(".", ",")}`
    )}`;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-border/40 bg-card shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-10 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="p-5 sm:p-7">
              {/* Header */}
              <div className="text-center mb-5 sm:mb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring" }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 mb-3"
                >
                  <Gift className="h-3 w-3 text-primary" />
                  <span className="font-display text-[9px] font-bold uppercase tracking-[0.15em] text-primary">
                    Oferta Especial
                  </span>
                </motion.div>
                <h2 className="font-display text-xl sm:text-2xl font-black text-foreground tracking-tight">
                  Ótima escolha! 🎯
                </h2>
              </div>

              {/* Selected product summary */}
              <div className="rounded-xl border border-border/30 bg-muted/20 p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <img src={vbucksIcon} alt="V-Bucks" className="h-8 w-8" />
                    <div>
                      <p className="font-display text-sm font-bold text-foreground">
                        {selectedProduct.amount.toLocaleString("pt-BR")} V-Bucks
                      </p>
                      <p className="font-body text-[10px] text-muted-foreground">Pacote selecionado</p>
                    </div>
                  </div>
                  <span className="font-display text-lg font-bold text-foreground">
                    R${selectedProduct.price.toFixed(2).replace(".", ",")}
                  </span>
                </div>
              </div>

              {/* Upsell card */}
              {upsellProduct && savingsPercent > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative rounded-xl border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-primary/10 p-4 mb-4 overflow-hidden"
                >
                  {/* Ribbon */}
                  <div className="absolute top-0 right-0">
                    <div className="rounded-bl-lg bg-gradient-gold px-3 py-1">
                      <span className="font-display text-[9px] font-bold text-primary-foreground uppercase tracking-wider">
                        Melhor Custo
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mb-3">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="font-display text-xs font-bold uppercase tracking-wider text-primary">
                      Que tal aproveitar mais?
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <img src={vbucksIcon} alt="V-Bucks" className="h-9 w-9" />
                      <div>
                        <p className="font-display text-base font-black text-foreground">
                          {upsellProduct.amount.toLocaleString("pt-BR")} V-Bucks
                        </p>
                        <p className="font-body text-[10px] text-emerald-400 font-medium">
                          Economize {savingsPercent}% por V-Buck
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {upsellProduct.original_price && (
                        <p className="font-body text-[10px] text-muted-foreground line-through">
                          R${Number(upsellProduct.original_price).toFixed(2).replace(".", ",")}
                        </p>
                      )}
                      <span className="font-display text-lg font-bold text-gradient-gold">
                        R${upsellProduct.price.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href="https://discord.gg/vbucksbarato"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-gold py-2.5 font-display text-[10px] font-bold uppercase tracking-[0.15em] text-primary-foreground shadow-gold hover:shadow-gold-intense transition-all"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Quero esse!
                    </a>
                    <a
                      href={buildWhatsAppUrl(upsellProduct)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center rounded-xl bg-[#25D366]/20 border border-[#25D366]/30 px-3 hover:bg-[#25D366]/30 transition-colors"
                    >
                      <img src={whatsappIcon} alt="WhatsApp" className="h-5 w-5" />
                    </a>
                  </div>
                </motion.div>
              )}

              {/* Urgency triggers */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-4 py-3 mb-4 rounded-xl bg-muted/20 border border-border/20"
              >
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span className="font-body text-[10px]">Entrega em até <span className="text-foreground font-medium">48h</span></span>
                </div>
                <div className="h-3 w-px bg-border/40" />
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="font-body text-[10px]"><span className="text-foreground font-medium">Garantia</span> vitalícia</span>
                </div>
              </motion.div>

              {/* Proceed with original selection */}
              <div className="space-y-2.5">
                <p className="font-body text-[10px] text-center text-muted-foreground uppercase tracking-widest">
                  Continuar com {selectedProduct.amount.toLocaleString("pt-BR")} V-Bucks
                </p>
                <div className="flex gap-2">
                  <a
                    href="https://discord.gg/vbucksbarato"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-[#5865F2]/40 bg-[#5865F2]/10 py-2.5 font-display text-[10px] font-bold uppercase tracking-[0.12em] text-[#5865F2] hover:bg-[#5865F2]/20 transition-colors"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z"/>
                    </svg>
                    Discord
                  </a>
                  <a
                    href={buildWhatsAppUrl(selectedProduct)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center rounded-xl bg-[#25D366]/20 border border-[#25D366]/30 px-3 hover:bg-[#25D366]/30 transition-colors"
                  >
                    <img src={whatsappIcon} alt="WhatsApp" className="h-5 w-5" />
                  </a>
                </div>
              </div>

              {/* Cross-sell: game accounts */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-5 pt-5 border-t border-border/20"
              >
                <div className="flex items-center gap-1.5 mb-3">
                  <Gift className="h-3.5 w-3.5 text-primary" />
                  <span className="font-display text-[11px] font-bold text-foreground uppercase tracking-wider">
                    Você também pode gostar
                  </span>
                </div>
                <button
                  onClick={() => { onClose(); navigate("/loja"); }}
                  className="w-full flex items-center justify-between rounded-xl border border-border/30 bg-muted/20 p-3.5 hover:border-primary/30 hover:bg-muted/40 transition-all group"
                >
                  <div className="text-left">
                    <p className="font-display text-xs font-bold text-foreground">Contas de Jogos</p>
                    <p className="font-body text-[10px] text-muted-foreground">
                      Fortnite, Valorant, LoL e mais — com inventário verificado
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpsellModal;
