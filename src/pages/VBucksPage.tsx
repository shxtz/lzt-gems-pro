import { motion, AnimatePresence } from "framer-motion";
import { Zap, ShoppingBag, ArrowLeft, Shield, Clock, Headphones, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import vbucksIcon from "@/assets/vbucks-icon.png";
import whatsappIcon from "@/assets/whatsapp-icon.svg";

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
            {originalPrice && originalPrice > price && (
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="font-body text-[11px] text-muted-foreground line-through">
                  R${Number(originalPrice).toFixed(2).replace(".", ",")}
                </span>
                <span className="inline-block rounded-md bg-emerald-500/20 border border-emerald-500/40 px-1.5 py-0.5 font-display text-[10px] font-bold text-emerald-400">
                  -{discount}%
                </span>
              </div>
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
                <div
                  className="absolute inset-0 -translate-x-full transition-transform duration-700 group-hover/btn:translate-x-full"
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
                  <img src={whatsappIcon} alt="WhatsApp" className="h-6 w-6" />
                </a>
              </motion.div>
            )}
          </AnimatePresence>
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
    </div>
  );
};

export default VBucksPage;
