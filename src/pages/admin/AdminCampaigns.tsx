import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone, Target, TrendingUp, Zap, Copy, Check, Plus,
  DollarSign, Users, Eye, MousePointerClick, ArrowRight,
  Instagram, MessageSquare, Globe, Search, BarChart3, Sparkles,
  ExternalLink, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

/* ── Campaign Templates ── */

interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  type: "paid" | "organic";
  channel: string;
  channelIcon: typeof Instagram;
  difficulty: "Fácil" | "Médio" | "Avançado";
  estimatedROI: string;
  steps: string[];
  copyTemplates: { title: string; text: string }[];
  tags: string[];
}

const templates: CampaignTemplate[] = [
  {
    id: "ig-reels-vbucks",
    name: "Reels V-Bucks — Oferta Relâmpago",
    description: "Crie um Reels curto mostrando o preço promocional de V-Bucks com senso de urgência.",
    type: "organic",
    channel: "Instagram",
    channelIcon: Instagram,
    difficulty: "Fácil",
    estimatedROI: "Alto",
    steps: [
      "Grave um vídeo de 10-15s mostrando o desconto",
      "Use texto na tela: \"V-Bucks até 23% OFF 🔥\"",
      "Adicione música trending do momento",
      "Coloque CTA no final: \"Link na bio\"",
      "Poste entre 18h-21h para maior alcance",
    ],
    copyTemplates: [
      {
        title: "Caption do Reels",
        text: "⚡ V-Bucks com até 23% de desconto!\n\n🎮 Recarregue sua conta Fortnite pelo menor preço do Brasil\n✅ Entrega em até 48h\n🔒 100% seguro\n\n👉 Link na bio\n\n#fortnite #vbucks #gamer #promoção",
      },
      {
        title: "Story com enquete",
        text: "Quanto você paga de V-Bucks? 🤔\n\nA) Preço cheio na Epic 😬\nB) Com desconto na nossa loja 😎\n\nLink nos destaques ⬆️",
      },
    ],
    tags: ["Instagram", "Reels", "V-Bucks", "Orgânico"],
  },
  {
    id: "meta-ads-contas",
    name: "Meta Ads — Contas Verificadas",
    description: "Campanha de tráfego pago no Facebook/Instagram para venda de contas de jogos.",
    type: "paid",
    channel: "Meta Ads",
    channelIcon: Target,
    difficulty: "Médio",
    estimatedROI: "Muito Alto",
    steps: [
      "Configure o Pixel do Meta na landing page /loja",
      "Crie público personalizado: Gamers 16-30 anos, interesse em Fortnite/Valorant",
      "Use imagem de alta qualidade com preço destacado",
      "Configure campanha de Conversão → Compra",
      "Orçamento inicial: R$ 30-50/dia",
      "Teste 3 criativos diferentes nos primeiros 3 dias",
      "Otimize para o criativo com melhor CTR após 72h",
    ],
    copyTemplates: [
      {
        title: "Texto do anúncio",
        text: "🎮 Contas de Fortnite verificadas a partir de R$ 29,90\n\n✅ Skins raras e exclusivas\n✅ Garantia vitalícia\n✅ Entrega imediata\n\n⚡ Últimas unidades disponíveis\n\n👉 Acesse agora e escolha a sua",
      },
      {
        title: "Headline do anúncio",
        text: "Contas Fortnite com Skins Raras | Garantia Vitalícia",
      },
    ],
    tags: ["Meta Ads", "Facebook", "Instagram", "Pago", "Contas"],
  },
  {
    id: "google-ads-vbucks",
    name: "Google Ads — Busca V-Bucks",
    description: "Campanha de Search para capturar usuários buscando V-Bucks baratos.",
    type: "paid",
    channel: "Google Ads",
    channelIcon: Search,
    difficulty: "Avançado",
    estimatedROI: "Alto",
    steps: [
      "Configure conta Google Ads com conversão no checkout",
      "Palavras-chave: 'comprar vbucks barato', 'vbucks desconto', 'recarga fortnite'",
      "Negativar: 'grátis', 'hack', 'gerador'",
      "Criar 3 anúncios responsivos de pesquisa",
      "Lance inicial: R$ 0,80-1,50 por clique",
      "Direcionar para /vbucks com UTM parameters",
      "Revisar termos de busca semanalmente",
    ],
    copyTemplates: [
      {
        title: "Título do anúncio 1",
        text: "V-Bucks com até 23% OFF | Entrega em 48h",
      },
      {
        title: "Título do anúncio 2",
        text: "Compre V-Bucks Barato | Garantia + Segurança",
      },
      {
        title: "Descrição do anúncio",
        text: "Recarregue sua conta Fortnite com o melhor preço do Brasil. Todos os pacotes disponíveis. Pagamento via Pix. Entrega garantida em até 48h.",
      },
    ],
    tags: ["Google Ads", "Search", "V-Bucks", "Pago"],
  },
  {
    id: "discord-community",
    name: "Discord — Comunidade & Engajamento",
    description: "Estratégia orgânica para criar uma comunidade ativa no Discord e gerar vendas recorrentes.",
    type: "organic",
    channel: "Discord",
    channelIcon: MessageSquare,
    difficulty: "Médio",
    estimatedROI: "Médio-Alto",
    steps: [
      "Crie canal #promoções para ofertas exclusivas",
      "Publique ofertas flash 2x por semana (terça e sexta)",
      "Use @everyone apenas para promoções especiais (max 1x/semana)",
      "Crie sistema de referral: quem indicar ganha desconto",
      "Poste prints de entregas bem-sucedidas em #provas",
      "Faça sorteios mensais para engajar a comunidade",
    ],
    copyTemplates: [
      {
        title: "Mensagem de promoção flash",
        text: "🔥 **PROMO FLASH — Só hoje!**\n\n🎮 Contas Fortnite com **20% OFF**\n💰 V-Bucks com o **menor preço do mês**\n\n⏰ Válido até meia-noite\n📩 Chame no privado para garantir\n\n||@everyone||",
      },
      {
        title: "Post de prova social",
        text: "✅ **Mais uma entrega realizada!**\n\n🎯 Conta Valorant Imortal entregue para @usuario\n⭐ Avaliação: 5/5\n\n> \"Entrega super rápida, recomendo!\" — cliente\n\n🛒 Quer a sua? Veja nosso catálogo em #loja",
      },
    ],
    tags: ["Discord", "Comunidade", "Orgânico"],
  },
  {
    id: "tiktok-organic",
    name: "TikTok — Conteúdo Viral",
    description: "Estratégia de conteúdo orgânico no TikTok para alcançar público gamer jovem.",
    type: "organic",
    channel: "TikTok",
    channelIcon: Globe,
    difficulty: "Fácil",
    estimatedROI: "Alto",
    steps: [
      "Crie conta comercial no TikTok",
      "Poste 1 vídeo/dia nos primeiros 30 dias",
      "Formatos: comparação de preços, unboxing de contas, reviews",
      "Use hashtags: #fortnite #vbucks #gamer #contasfortnite",
      "Responda todos os comentários nas primeiras 2h",
      "Coloque link da loja na bio",
    ],
    copyTemplates: [
      {
        title: "Script de vídeo comparação",
        text: "\"Quanto você paga de V-Bucks na Epic? 🤔\n\n1000 V-Bucks na Epic: R$ 27,99\n1000 V-Bucks na nossa loja: R$ 21,99\n\nIsso é 23% de economia! 💰\n\nLink na bio 👆\"",
      },
    ],
    tags: ["TikTok", "Orgânico", "Vídeo"],
  },
  {
    id: "retargeting-meta",
    name: "Retargeting — Carrinho Abandonado",
    description: "Campanha de retargeting para reconquistar visitantes que não finalizaram a compra.",
    type: "paid",
    channel: "Meta Ads",
    channelIcon: Target,
    difficulty: "Avançado",
    estimatedROI: "Muito Alto",
    steps: [
      "Certifique-se que o Pixel está rastreando 'AddToCart' e 'InitiateCheckout'",
      "Crie público: visitou /checkout nos últimos 7 dias sem converter",
      "Use criativo com desconto exclusivo de 10%",
      "Frequência máxima: 3 impressões por pessoa em 7 dias",
      "Orçamento: R$ 15-25/dia",
      "Inclua cupom exclusivo no criativo",
    ],
    copyTemplates: [
      {
        title: "Texto de retargeting",
        text: "Ei, você esqueceu algo! 👀\n\n🎮 Sua conta de Fortnite ainda está esperando por você\n🎁 Use o cupom VOLTE10 e ganhe 10% OFF\n\n⏰ Válido por 48h\n\n👉 Finalize sua compra agora",
      },
    ],
    tags: ["Meta Ads", "Retargeting", "Pago", "Avançado"],
  },
];

/* ── Quick Metrics (static demo) ── */

const metrics = [
  { label: "Visitantes (7d)", value: "—", icon: Eye, color: "text-blue-400" },
  { label: "Conversão", value: "—", icon: MousePointerClick, color: "text-emerald-400" },
  { label: "Receita Ads", value: "—", icon: DollarSign, color: "text-primary" },
  { label: "Custo/Aquisição", value: "—", icon: Users, color: "text-orange-400" },
];

/* ── Component ── */

const AdminCampaigns = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const CampaignCard = ({ tpl }: { tpl: CampaignTemplate }) => {
    const isExpanded = expandedId === tpl.id;

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-border/30 bg-card overflow-hidden hover:border-primary/20 transition-colors"
      >
        {/* Header */}
        <div
          onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
          className="cursor-pointer p-4 sm:p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <tpl.channelIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-sm font-bold text-foreground truncate">{tpl.name}</h3>
                <p className="font-body text-xs text-muted-foreground mt-0.5 line-clamp-2">{tpl.description}</p>
              </div>
            </div>
            <ArrowRight className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge variant="outline" className={`text-[9px] ${tpl.type === "paid" ? "border-orange-500/30 text-orange-400" : "border-emerald-500/30 text-emerald-400"}`}>
              {tpl.type === "paid" ? "💰 Pago" : "🌱 Orgânico"}
            </Badge>
            <Badge variant="outline" className="text-[9px] border-border/40 text-muted-foreground">
              {tpl.difficulty}
            </Badge>
            <Badge variant="outline" className="text-[9px] border-primary/30 text-primary">
              ROI {tpl.estimatedROI}
            </Badge>
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 sm:px-5 pb-5 space-y-5 border-t border-border/20 pt-4">
                {/* Steps */}
                <div>
                  <h4 className="font-display text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" /> Passo a Passo
                  </h4>
                  <ol className="space-y-1.5">
                    {tpl.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="shrink-0 h-5 w-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Copy Templates */}
                <div>
                  <h4 className="font-display text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-primary" /> Textos Prontos
                  </h4>
                  <div className="space-y-3">
                    {tpl.copyTemplates.map((ct, i) => {
                      const copyId = `${tpl.id}-copy-${i}`;
                      return (
                        <div key={i} className="rounded-lg bg-muted/20 border border-border/20 p-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-display text-[10px] font-bold text-foreground uppercase tracking-wider">{ct.title}</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCopy(ct.text, copyId); }}
                              className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                            >
                              {copiedId === copyId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              {copiedId === copyId ? "Copiado" : "Copiar"}
                            </button>
                          </div>
                          <pre className="font-body text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed">{ct.text}</pre>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {tpl.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full bg-muted/30 border border-border/20 text-[9px] text-muted-foreground">{tag}</span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  const paidTemplates = templates.filter((t) => t.type === "paid");
  const organicTemplates = templates.filter((t) => t.type === "organic");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" /> Campanhas de Marketing
        </h1>
        <p className="font-body text-sm text-muted-foreground mt-1">
          Estruturas prontas para executar campanhas de tráfego pago e orgânico
        </p>
      </div>

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl border border-border/30 bg-card p-3 sm:p-4">
            <div className="flex items-center gap-2 mb-1">
              <m.icon className={`h-4 w-4 ${m.color}`} />
              <span className="font-body text-[10px] text-muted-foreground">{m.label}</span>
            </div>
            <span className="font-display text-lg font-bold text-foreground">{m.value}</span>
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground -mt-2">
        💡 Conecte Google Analytics e Meta Pixel para ver métricas reais aqui
      </p>

      {/* Campaigns */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-muted/20 border border-border/20">
          <TabsTrigger value="all" className="text-xs">Todas ({templates.length})</TabsTrigger>
          <TabsTrigger value="paid" className="text-xs">💰 Pago ({paidTemplates.length})</TabsTrigger>
          <TabsTrigger value="organic" className="text-xs">🌱 Orgânico ({organicTemplates.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4 space-y-3">
          {templates.map((tpl) => <CampaignCard key={tpl.id} tpl={tpl} />)}
        </TabsContent>

        <TabsContent value="paid" className="mt-4 space-y-3">
          {paidTemplates.map((tpl) => <CampaignCard key={tpl.id} tpl={tpl} />)}
        </TabsContent>

        <TabsContent value="organic" className="mt-4 space-y-3">
          {organicTemplates.map((tpl) => <CampaignCard key={tpl.id} tpl={tpl} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminCampaigns;
