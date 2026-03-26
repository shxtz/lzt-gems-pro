import { motion, AnimatePresence } from "framer-motion";
import { Zap, ShoppingBag, ArrowLeft, Shield, Clock, Headphones } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import UpsellModal from "@/components/vbucks/UpsellModal";
import vbucksIcon from "@/assets/vbucks-icon.png";

interface VBucksProduct {
  id: string;
  amount: number;
  price: number;
  original_price?: number | null;
  popular?: boolean;
}

interface VBucksCardProps extends VBucksProduct {
  index: number;
  onBuy: (product: VBucksProduct) => void;
}

const VBucksCard = ({ id, amount, price, original_price: originalPrice, popular, index, onBuy }: VBucksCardProps) => {
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

        <div className="relative z-10 p-4 sm:p-7 text-center">
          <div className="mb-1 flex items-center justify-center gap-1.5 sm:gap-2">
            <img src={vbucksIcon} alt="V-Bucks" className="h-8 w-8 sm:h-10 sm:w-10" />
            <span className="font-display text-2xl sm:text-3xl md:text-4xl font-black text-gradient-gold">
              {amount.toLocaleString("pt-BR")}
            </span>
          </div>
          <div className="font-body text-[9px] sm:text-[10px] text-muted-foreground uppercase tracking-[0.25em] mb-4 sm:mb-6">
            V-Bucks
          </div>

          <div className="mx-auto mb-4 sm:mb-6 h-[1px] w-12 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />

          <div className="mb-5 sm:mb-7">
            {originalPrice && originalPrice > price && (
              <div className="flex items-center justify-center gap-1.5 sm:gap-2 mb-1">
                <span className="font-body text-[10px] sm:text-[11px] text-muted-foreground line-through">
                  R${Number(originalPrice).toFixed(2).replace(".", ",")}
                </span>
                <span className="inline-block rounded-md bg-emerald-500/20 border border-emerald-500/40 px-1 sm:px-1.5 py-0.5 font-display text-[9px] sm:text-[10px] font-bold text-emerald-400">
                  -{discount}%
                </span>
              </div>
            )}
            <span className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              R${price.toFixed(2).replace(".", ",")}
            </span>
          </div>

          <motion.button
            onClick={() => onBuy({ id, amount, price, original_price: originalPrice, popular })}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`group/btn relative w-full overflow-hidden rounded-xl py-3 sm:py-3.5 font-display text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] transition-all duration-300 ${
              popular
                ? "bg-gradient-gold text-primary-foreground shadow-gold"
                : "glass-gold text-foreground hover:shadow-gold"
            }`}
          >
            <span className="relative z-10 flex items-center justify-center gap-2">
              <ShoppingBag className="h-3.5 w-3.5" />
              Comprar
            </span>
            <div
              className="absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/btn:translate-x-full"
              style={{ background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.1), transparent)" }}
            />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

const VBucksPage = () => {
  const navigate = useNavigate();
  const [selectedProduct, setSelectedProduct] = useState<VBucksProduct | null>(null);

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

  const allProducts: VBucksProduct[] = (products || []).map((p) => ({
    id: p.id,
    amount: p.amount,
    price: Number(p.price),
    original_price: p.original_price,
    popular: p.popular ?? false,
  }));

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
              <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-black mb-4 tracking-tight">
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
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-10 sm:mb-14 max-w-3xl mx-auto"
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 md:gap-6">
              {products?.map((opt, i) => (
                <VBucksCard
                  key={opt.id}
                  id={opt.id}
                  amount={opt.amount}
                  price={Number(opt.price)}
                  original_price={opt.original_price}
                  popular={opt.popular ?? false}
                  index={i}
                  onBuy={setSelectedProduct}
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
                {
                  q: "🏪 Como nosso serviço funciona?",
                  a: "Trabalhamos diretamente com a sua economia nas compras de itens no Fortnite (seja pacotes, trajes, danças, músicas, mascotes e passes). Você escolhe o item desejado (skin, pacote etc), seleciona a quantia em V-Bucks e nós enviamos o presente diretamente para sua conta através da lista de amigos no jogo."
                },
                {
                  q: "🌟 Entenda com um exemplo básico",
                  a: "Sabe aquela skin maneira de 1.500 V-Bucks? Então... Você realiza a compra de 1.500 V-Bucks clicando no botão \"Comprar V-Bucks\", após a compra abra um pedido de atendimento e, através dali, seu item comprado já está a caminho."
                },
                {
                  q: "🎖️ Passes de Batalha",
                  a: "Nossos Passes possuem um valor um pouco superior ao painel de V-Bucks que temos aqui na loja, pois o método de envio utilizado para Passes e itens (skins, picaretas, pacotes etc.) é diferente. Esse sistema foi criado justamente para viabilizar a economia na compra de Passes, mantendo a segurança do processo."
                },
                {
                  q: "🎆 Informações básicas do nosso serviço",
                  a: "Não é necessário informar login ou senha. Você nos envia apenas o nome in-game para que possamos realizar a adição de amizade. Todo o processo é feito exclusivamente via pedido de amizade dentro do jogo, garantindo total segurança e privacidade. 🎁 Garantia vitalícia. Pedido entregue ou seu dinheiro de volta!"
                },
                {
                  q: "Quanto tempo demora a entrega?",
                  a: "A entrega é feita em até 48 horas após a confirmação do pagamento. Você será notificado assim que o envio for concluído."
                },
                {
                  q: "Aceita quais formas de pagamento?",
                  a: "Atualmente aceitamos pagamento via PIX com desconto especial."
                },
              ].map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-2xl border border-border/40 bg-card overflow-hidden"
                >
                  <summary className="cursor-pointer px-6 py-4 font-display text-sm text-foreground flex items-center justify-between list-none">
                    {faq.q}
                    <span className="text-muted-foreground transition-transform group-open:rotate-45 text-lg">+</span>
                  </summary>
                  <div className="px-6 pb-4 font-body text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />

      {/* Upsell Modal */}
      {selectedProduct && (
        <UpsellModal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          selectedProduct={selectedProduct}
          allProducts={allProducts}
        />
      )}
    </div>
  );
};

export default VBucksPage;
