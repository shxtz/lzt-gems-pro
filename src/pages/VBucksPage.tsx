import { motion } from "framer-motion";
import { Zap, ShoppingBag, ArrowLeft, Shield, Clock, Headphones } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import vbucksIcon from "@/assets/vbucks-icon.png";

interface VBucksCardProps {
  id: string;
  amount: number;
  price: number;
  originalPrice?: number | null;
  popular?: boolean;
  index: number;
}

const VBucksCard = ({ id, amount, price, originalPrice, popular, index }: VBucksCardProps) => {
  const { addItem } = useCart();
  const navigate = useNavigate();

  const handleBuy = () => {
    addItem({ productId: id, amount, price });
    toast.success(`${amount.toLocaleString("pt-BR")} V-Bucks adicionado ao carrinho!`);
  };

  const handleBuyNow = () => {
    addItem({ productId: id, amount, price });
    navigate("/checkout");
  };

  const discount = originalPrice ? Math.round((1 - price / originalPrice) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8 }}
      className="group relative"
    >
      {popular && (
        <motion.div
          className="absolute -top-3 left-1/2 -translate-x-1/2 z-20"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
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
          {discount > 0 && (
            <div className="absolute top-3 right-3">
              <span className="rounded-lg bg-green-500/20 px-2 py-1 text-[10px] font-bold text-green-400">
                -{discount}%
              </span>
            </div>
          )}

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

          <div className="space-y-2">
            <motion.button
              onClick={handleBuyNow}
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
                Comprar Agora
              </span>
              <div
                className="absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/btn:translate-x-full"
                style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.1), transparent)" }}
              />
            </motion.button>

            <motion.button
              onClick={handleBuy}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full rounded-xl border border-border/40 py-2.5 font-display text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
            >
              Adicionar ao Carrinho
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const VBucksPage = () => {
  const navigate = useNavigate();

  const { data: products, isLoading } = useQuery({
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

  const features = [
    { icon: Shield, title: "100% Seguro", desc: "Transações protegidas" },
    { icon: Clock, title: "Entrega Rápida", desc: "Receba em minutos" },
    { icon: Headphones, title: "Suporte 24h", desc: "Atendimento via WhatsApp" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-28 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-12">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="font-body text-sm">Voltar</span>
            </button>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-block font-body text-[10px] text-primary uppercase tracking-[0.3em] mb-4"
              >
                ⬡ Todos os Pacotes
              </motion.span>
              <h1 className="font-display text-5xl md:text-6xl font-black mb-4 tracking-tight">
                <span className="text-gradient-gold-shine">V-BUCKS</span>
              </h1>
              <p className="font-body text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Escolha a quantidade ideal e receba instantaneamente na sua conta Fortnite.
                Pagamento via PIX com desconto.
              </p>
            </motion.div>
          </div>

          {/* Features Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-3 gap-4 mb-14 max-w-3xl mx-auto"
          >
            {features.map((f, i) => (
              <div key={i} className="text-center p-4 rounded-2xl border border-border/30 bg-card/50">
                <f.icon className="h-5 w-5 text-primary mx-auto mb-2" />
                <p className="font-display text-xs text-foreground uppercase tracking-wider">{f.title}</p>
                <p className="font-body text-[10px] text-muted-foreground mt-0.5">{f.desc}</p>
              </div>
            ))}
          </motion.div>

          {/* Products Grid */}
          {isLoading ? (
            <div className="text-center py-20 text-muted-foreground">Carregando produtos...</div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
              {products?.map((opt, i) => (
                <VBucksCard
                  key={opt.id}
                  id={opt.id}
                  amount={opt.amount}
                  price={Number(opt.price)}
                  originalPrice={opt.original_price}
                  popular={opt.popular ?? false}
                  index={i}
                />
              ))}
            </div>
          )}

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-20 max-w-2xl mx-auto"
          >
            <h2 className="font-display text-2xl text-foreground text-center mb-8">
              Perguntas Frequentes
            </h2>
            <div className="space-y-3">
              {[
                { q: "Como recebo os V-Bucks?", a: "Após a confirmação do pagamento PIX, os V-Bucks são enviados diretamente para sua conta Fortnite através do seu nome de usuário Epic Games." },
                { q: "Quanto tempo demora?", a: "A entrega é feita em até 30 minutos após a confirmação do pagamento. Em horários de pico pode levar um pouco mais." },
                { q: "É seguro comprar aqui?", a: "Sim! Utilizamos métodos seguros e já realizamos mais de 2.000 vendas com avaliação 4.9 estrelas." },
                { q: "Aceita quais formas de pagamento?", a: "Atualmente aceitamos pagamento via PIX com desconto especial." },
              ].map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-border/40 bg-card overflow-hidden"
                >
                  <summary className="cursor-pointer px-6 py-4 font-display text-sm text-foreground flex items-center justify-between list-none">
                    {faq.q}
                    <span className="text-muted-foreground transition-transform group-open:rotate-45 text-lg">+</span>
                  </summary>
                  <div className="px-6 pb-4 font-body text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default VBucksPage;
