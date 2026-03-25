import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import {
  Search, ShoppingCart, Zap, Package, Key, Mail,
  QrCode, Copy, Check, X, Loader2, Eye, ChevronRight,
  Gamepad2, Star, Tag, SlidersHorizontal, Globe, Shield, Clock, Trophy, BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import FloatingChat from "@/components/FloatingChat";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import accountBannerDefault from "@/assets/account-banner-default.jpg";
import { getLztAccountImageUrl } from "@/lib/lzt-image";
import AccountDetails, { extractAccountInfo, getValorantRankIcon, getValorantRankName } from "@/components/AccountDetails";

interface LztAccount {
  id: string;
  lzt_item_id: string;
  title: string | null;
  price_brl: number;
  price_usd: number;
  status: string;
  category_id: string;
  data: any;
  imported_at: string;
}

interface LztCategory {
  id: string;
  name: string;
  icon_url: string | null;
  margin_percent: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  image_url: string | null;
  active: boolean;
}

interface Variation {
  id: string;
  product_id: string;
  name: string;
  price: number;
  original_price: number | null;
  credential_type: string;
  active: boolean;
}

interface PixData {
  qrcode: string;
  copiaecola: string;
  txid: string;
  orderId: string;
  variationId?: string;
  variationName: string;
  amount: number;
  lztAccountId?: string;
}

const getShortId = (lztItemId: string) => {
  const num = parseInt(lztItemId.slice(-6), 10);
  return isNaN(num) ? lztItemId.slice(-6) : String(num);
};

const getAccountImage = (data: any, categoryName?: string): string | null => {
  const lztImage = getLztAccountImageUrl(data, categoryName);
  if (lztImage) return lztImage;
  return null;
};

const formatLastSeen = (timestamp: number): string => {
  if (!timestamp) return "Desconhecido";
  const date = new Date(timestamp * 1000);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 30) return `${diffDays} dias atrás`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses atrás`;
  return `${Math.floor(diffDays / 365)} anos atrás`;
};

const countryFlag = (code: string): string => {
  if (!code || code.length !== 2) return "🌍";
  const codePoints = code.toUpperCase().split("").map(c => 127397 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
};

const extractInventoryInfo = (data: any) => {
  if (!data || typeof data !== "object") return [];
  const info: { label: string; value: string; icon: string }[] = [];
  const d = data as Record<string, any>;
  const category = d.category?.category_name || "";

  if (category === "telegram") {
    if (d.telegram_country) info.push({ label: "País", value: `${countryFlag(d.telegram_country)} ${d.telegram_country}`, icon: "country" });
    if (d.telegram_last_seen) info.push({ label: "Último Login", value: formatLastSeen(d.telegram_last_seen), icon: "clock" });
    if (d.telegram_spam_block !== undefined) info.push({ label: "Spam Block", value: d.telegram_spam_block === -1 ? "✅ Limpo" : "⚠️ Sim", icon: "spam" });
    if (d.telegram_premium !== undefined) info.push({ label: "Premium", value: d.telegram_premium ? "⭐ Sim" : "Não", icon: "premium" });
    if (d.telegram_password !== undefined) info.push({ label: "2FA", value: d.telegram_password ? "🔒 Ativado" : "Desativado", icon: "2fa" });
    if (d.published_date) {
      const days = Math.floor((Date.now() / 1000 - d.published_date) / 86400);
      info.push({ label: "Idade da Conta", value: `${days}+ dias`, icon: "age" });
    }
    if (d.telegram_contacts_count !== undefined) info.push({ label: "Contatos", value: String(d.telegram_contacts_count), icon: "contacts" });
    if (d.telegram_chats_count !== undefined) info.push({ label: "Chats", value: String(d.telegram_chats_count), icon: "chats" });
    if (d.telegram_channels_count !== undefined) info.push({ label: "Canais", value: String(d.telegram_channels_count), icon: "channels" });
    if (d.telegram_dc_id) info.push({ label: "DC", value: `DC${d.telegram_dc_id}`, icon: "dc" });
  } else if (category === "discord") {
    if (d.discord_country) info.push({ label: "País", value: `${countryFlag(d.discord_country)} ${d.discord_country}`, icon: "country" });
    if (d.discordAccountConditionLabel) info.push({ label: "Condição", value: d.discordAccountConditionLabel, icon: "condition" });
    if (d.discord_register_date) info.push({ label: "Registrado", value: formatLastSeen(d.discord_register_date), icon: "clock" });
    if (d.discordNitroType && d.discordNitroType !== "No") info.push({ label: "Nitro", value: d.discordNitroType, icon: "premium" });
    if (d.discord_2fa !== undefined) info.push({ label: "2FA", value: d.discord_2fa ? "🔒 Ativado" : "Desativado", icon: "2fa" });
    if (d.discord_verified !== undefined) info.push({ label: "Verificado", value: d.discord_verified ? "✅ Sim" : "Não", icon: "verified" });
    if (d.discord_server_count !== undefined) info.push({ label: "Servidores", value: String(d.discord_server_count), icon: "servers" });
    if (d.discordLocaleTitle) info.push({ label: "Idioma", value: d.discordLocaleTitle, icon: "locale" });
  } else {
    if (d.category?.category_title) info.push({ label: "Plataforma", value: d.category.category_title, icon: "platform" });
    if (d.published_date) {
      const days = Math.floor((Date.now() / 1000 - d.published_date) / 86400);
      info.push({ label: "Idade", value: `${days}+ dias`, icon: "age" });
    }
    if (d.itemOriginPhrase) info.push({ label: "Origem", value: d.itemOriginPhrase, icon: "origin" });
  }
  return info;
};

const getUniqueCountries = (accounts: LztAccount[]) => {
  const countries = new Set<string>();
  accounts.forEach((a) => {
    const d = a.data as any;
    const country = d?.telegram_country || d?.discord_country;
    if (country) countries.add(country);
  });
  return Array.from(countries).sort();
};

const Shop = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<"contas" | "produtos">("contas");
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [deliveredCredential, setDeliveredCredential] = useState<{ credential: string; name: string } | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [viewAccount, setViewAccount] = useState<LztAccount | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterCountry, setFilterCountry] = useState<string>("");
  const [filterPriceMax, setFilterPriceMax] = useState<string>("");
  const [filterSpamFree, setFilterSpamFree] = useState(false);
  const [filterPremium, setFilterPremium] = useState(false);
  const [sortBy, setSortBy] = useState<"recent" | "price_asc" | "price_desc">("recent");

  const { data: lztCategories } = useQuery({
    queryKey: ["shop-lzt-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lzt_categories").select("*").order("sort_order");
      if (error) throw error;
      return data as LztCategory[];
    },
  });

  const { data: lztAccounts } = useQuery({
    queryKey: ["shop-lzt-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("lzt_accounts").select("*").eq("status", "available").order("imported_at", { ascending: false });
      if (error) throw error;
      return data as LztAccount[];
    },
    refetchInterval: 30000,
  });

  const { data: products } = useQuery({
    queryKey: ["shop-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: variations } = useQuery({
    queryKey: ["shop-variations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_variations").select("*").eq("active", true).order("sort_order");
      if (error) throw error;
      return data as Variation[];
    },
  });

  const { data: stockCounts } = useQuery({
    queryKey: ["shop-stock-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_stock").select("variation_id").eq("status", "available");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((s) => { counts[s.variation_id] = (counts[s.variation_id] || 0) + 1; });
      return counts;
    },
    refetchInterval: 15000,
  });

  const availableCountries = useMemo(() => getUniqueCountries(lztAccounts || []), [lztAccounts]);

  const getCategoryName = (catId: string) =>
    lztCategories?.find((c) => c.id === catId)?.name || "Sem categoria";

  const filteredAccounts = useMemo(() => {
    let accounts = lztAccounts?.filter((a) => {
      const matchCategory = !selectedCategory || a.category_id === selectedCategory;
      const matchSearch = !searchTerm ||
        `CONTA BARATA #${getShortId(a.lzt_item_id)}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getCategoryName(a.category_id).toLowerCase().includes(searchTerm.toLowerCase());
      const d = a.data as any;
      const country = d?.telegram_country || d?.discord_country;
      const matchCountry = !filterCountry || country === filterCountry;
      const matchPrice = !filterPriceMax || Number(a.price_brl) <= Number(filterPriceMax);
      const matchSpam = !filterSpamFree || d?.telegram_spam_block === -1;
      const matchPremium = !filterPremium || d?.telegram_premium === 1;
      return matchCategory && matchSearch && matchCountry && matchPrice && matchSpam && matchPremium;
    }) || [];

    if (sortBy === "price_asc") accounts.sort((a, b) => Number(a.price_brl) - Number(b.price_brl));
    else if (sortBy === "price_desc") accounts.sort((a, b) => Number(b.price_brl) - Number(a.price_brl));
    return accounts;
  }, [lztAccounts, selectedCategory, searchTerm, filterCountry, filterPriceMax, filterSpamFree, filterPremium, sortBy, lztCategories]);

  const getCategoryCount = (catId: string) => lztAccounts?.filter((a) => a.category_id === catId).length || 0;
  const getProductVariations = (productId: string) => variations?.filter((v) => v.product_id === productId) || [];
  const getLowestPrice = (productId: string) => {
    const pvars = getProductVariations(productId);
    return pvars.length === 0 ? null : Math.min(...pvars.map((v) => Number(v.price)));
  };
  const getStockCount = (variationId: string) => stockCounts?.[variationId] || 0;

  const filteredProducts = products?.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !selectedCategory || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const handleBuyAccount = async (account: LztAccount) => {
    if (!user) { toast.error("Faça login para comprar"); navigate("/auth"); return; }
    setPurchasing(account.id);
    try {
      const { data: order, error: orderError } = await supabase.from("orders").insert({ user_id: user.id, quantity: 1, total_price: account.price_brl, payment_method: "pix", status: "pending" }).select().single();
      if (orderError) throw orderError;
      const accountName = `CONTA BARATA #${getShortId(account.lzt_item_id)}`;
      const { data: pixResponse, error: pixError } = await supabase.functions.invoke("create-pix-charge", { body: { orderId: order.id, amount: account.price_brl, description: `${accountName} - Loja` } });
      if (pixError) throw pixError;
      if (pixResponse?.error) throw new Error(pixResponse.error);
      await supabase.from("orders").update({ payment_id: pixResponse.txid }).eq("id", order.id);
      setPixData({ qrcode: pixResponse.qrcode, copiaecola: pixResponse.copiaecola, txid: pixResponse.txid, orderId: order.id, variationName: accountName, amount: account.price_brl, lztAccountId: account.id });
    } catch (err: any) { console.error(err); toast.error("Erro ao gerar pagamento PIX."); }
    finally { setPurchasing(null); }
  };

  const handleBuyVariation = async (variation: Variation) => {
    if (!user) { toast.error("Faça login para comprar"); navigate("/auth"); return; }
    const stock = getStockCount(variation.id);
    if (stock === 0) { toast.error("Produto sem estoque disponível"); return; }
    setPurchasing(variation.id);
    try {
      const { data: order, error: orderError } = await supabase.from("orders").insert({ user_id: user.id, product_id: variation.product_id, quantity: 1, total_price: Number(variation.price), payment_method: "pix", status: "pending" }).select().single();
      if (orderError) throw orderError;
      const { data: pixResponse, error: pixError } = await supabase.functions.invoke("create-pix-charge", { body: { orderId: order.id, amount: Number(variation.price), description: `${variation.name} - Loja Digital` } });
      if (pixError) throw pixError;
      if (pixResponse?.error) throw new Error(pixResponse.error);
      await supabase.from("orders").update({ payment_id: pixResponse.txid }).eq("id", order.id);
      setPixData({ qrcode: pixResponse.qrcode, copiaecola: pixResponse.copiaecola, txid: pixResponse.txid, orderId: order.id, variationId: variation.id, variationName: variation.name, amount: Number(variation.price) });
    } catch (err: any) { console.error(err); toast.error("Erro ao gerar pagamento PIX."); }
    finally { setPurchasing(null); }
  };

  const confirmPaymentAndDeliver = async () => {
    if (!pixData || !user) return;
    setCheckingPayment(true);
    try {
      if (pixData.variationId) {
        const { data, error } = await supabase.functions.invoke("deliver-product", { body: { variationId: pixData.variationId, buyerId: user.id, orderId: pixData.orderId } });
        if (error) throw error;
        if (data.error) { toast.error(data.error); return; }
        await supabase.from("orders").update({ status: "paid" }).eq("id", pixData.orderId);
        setDeliveredCredential({ credential: data.credential, name: pixData.variationName });
      } else if (pixData.lztAccountId) {
        const { error } = await supabase.from("lzt_accounts").update({ status: "sold", buyer_id: user.id, sold_at: new Date().toISOString(), sold_price: pixData.amount }).eq("id", pixData.lztAccountId).eq("status", "available");
        if (error) throw error;
        await supabase.from("orders").update({ status: "paid" }).eq("id", pixData.orderId);
        const { data: soldAccount } = await supabase.from("lzt_accounts").select("*").eq("id", pixData.lztAccountId).single();
        const credentialInfo = soldAccount?.data ? JSON.stringify(soldAccount.data, null, 2) : "Conta entregue - verifique sua área do cliente";
        setDeliveredCredential({ credential: credentialInfo, name: pixData.variationName });
        queryClient.invalidateQueries({ queryKey: ["shop-lzt-accounts"] });
      }
      setPixData(null);
      toast.success("Pagamento confirmado! Produto entregue.");
    } catch { toast.error("Erro ao confirmar pagamento."); }
    finally { setCheckingPayment(false); }
  };

  const copyPix = () => {
    if (pixData?.copiaecola) {
      navigator.clipboard.writeText(pixData.copiaecola);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const copyCredential = () => {
    if (deliveredCredential) {
      navigator.clipboard.writeText(deliveredCredential.credential);
      toast.success("Credencial copiada!");
    }
  };

  const activeFiltersCount = [filterCountry, filterPriceMax, filterSpamFree, filterPremium].filter(Boolean).length;

  // Render inventory icon
  const InfoIcon = ({ type }: { type: string }) => {
    switch (type) {
      case "country": return <Globe className="h-3 w-3 text-primary shrink-0" />;
      case "clock": return <Clock className="h-3 w-3 text-primary shrink-0" />;
      case "spam": return <Shield className="h-3 w-3 text-primary shrink-0" />;
      case "premium": return <Star className="h-3 w-3 text-primary shrink-0" />;
      case "age": return <Clock className="h-3 w-3 text-primary shrink-0" />;
      case "rank": return <Trophy className="h-3 w-3 text-primary shrink-0" />;
      case "level": return <BarChart3 className="h-3 w-3 text-primary shrink-0" />;
      case "star": return <Star className="h-3 w-3 text-primary shrink-0" />;
      case "trophy": return <Trophy className="h-3 w-3 text-primary shrink-0" />;
      case "coins": return <Tag className="h-3 w-3 text-primary shrink-0" />;
      case "verified": return <Shield className="h-3 w-3 text-primary shrink-0" />;
      case "platform": return <Gamepad2 className="h-3 w-3 text-primary shrink-0" />;
      default: return <Tag className="h-3 w-3 text-primary shrink-0" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* PIX Modal */}
      <AnimatePresence>
        {pixData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card border border-primary/30 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-gold relative">
              <button onClick={() => setPixData(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3"><QrCode className="h-6 w-6 text-primary" /></div>
                <h3 className="font-display text-lg text-foreground">Pagamento PIX</h3>
                <p className="text-xs text-muted-foreground mt-1">{pixData.variationName}</p>
                <p className="text-lg font-bold text-primary mt-2">R$ {pixData.amount.toFixed(2)}</p>
              </div>
              {pixData.qrcode && (
                <div className="bg-white rounded-xl p-4 mx-auto w-fit">
                  <img src={pixData.qrcode.startsWith("data:") ? pixData.qrcode : `data:image/png;base64,${pixData.qrcode}`} alt="QR Code PIX" className="w-48 h-48" />
                </div>
              )}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-display">Copia e Cola</p>
                <div className="flex gap-2">
                  <input readOnly value={pixData.copiaecola} className="flex-1 rounded-xl border border-border/40 bg-background px-3 py-2.5 text-xs text-foreground font-mono truncate" />
                  <Button size="sm" variant="outline" onClick={copyPix} className="shrink-0">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button>
                </div>
              </div>
              <Button onClick={confirmPaymentAndDeliver} disabled={checkingPayment} className="w-full bg-gradient-gold text-primary-foreground font-display">
                {checkingPayment ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Confirmando...</> : "Já paguei - Confirmar"}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">Após pagar, clique em "Já paguei" para receber sua credencial.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delivered Modal */}
      <AnimatePresence>
        {deliveredCredential && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setDeliveredCredential(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-card border border-primary/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-gold">
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3"><Zap className="h-6 w-6 text-primary" /></div>
                <h3 className="font-display text-lg text-foreground">Entrega Realizada!</h3>
                <p className="text-xs text-muted-foreground mt-1">{deliveredCredential.name}</p>
              </div>
              <div className="rounded-xl bg-muted/20 border border-border/30 p-4 max-h-48 overflow-y-auto">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-display">Sua credencial</p>
                <p className="text-sm text-foreground font-mono break-all select-all whitespace-pre-wrap">{deliveredCredential.credential}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={copyCredential} className="flex-1 bg-gradient-gold text-primary-foreground">Copiar</Button>
                <Button variant="outline" onClick={() => setDeliveredCredential(null)}>Fechar</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Detail Modal */}
      <AnimatePresence>
        {viewAccount && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewAccount(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-card border border-border/40 rounded-2xl max-w-lg w-full overflow-hidden relative">
              <button onClick={() => setViewAccount(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"><X className="h-4 w-4" /></button>

              {/* Banner - uses LZT image or fallback */}
              <div className="h-36 overflow-hidden relative">
                <img
                  src={getAccountImage(viewAccount.data) || accountBannerDefault}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                <div className="absolute bottom-3 left-4">
                  <Badge className="bg-primary/90 text-primary-foreground text-[10px] uppercase font-display">
                    {getCategoryName(viewAccount.category_id)}
                  </Badge>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <h3 className="font-display text-lg text-foreground">
                  CONTA BARATA #{getShortId(viewAccount.lzt_item_id)}
                </h3>

                {/* Full Inventory Grid */}
                {(() => {
                  const info = extractInventoryInfo(viewAccount.data);
                  return info.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                      {info.map((item, i) => (
                        <div key={i} className="rounded-xl bg-muted/10 border border-border/20 p-3 flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <InfoIcon type={item.icon} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                            <p className="text-sm text-foreground font-medium truncate">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null;
                })()}

                <div className="flex items-center justify-between pt-2 border-t border-border/20">
                  <span className="text-2xl font-bold text-primary">R$ {Number(viewAccount.price_brl).toFixed(2)}</span>
                  <Button onClick={() => { setViewAccount(null); handleBuyAccount(viewAccount); }} disabled={purchasing === viewAccount.id} className="bg-gradient-gold text-primary-foreground font-display gap-2">
                    <ShoppingCart className="h-4 w-4" /> Comprar Agora
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-16">
        <div className="flex">
          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col w-64 min-h-[calc(100vh-4rem)] border-r border-border/30 bg-card/50 sticky top-16 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-display text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Categorias</h3>
              <nav className="space-y-1">
                <button onClick={() => { setSelectedCategory(null); setSelectedTab("contas"); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${!selectedCategory && selectedTab === "contas" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}>
                  <div className="flex items-center gap-2.5"><Gamepad2 className="h-4 w-4" /><span>Todas as Contas</span></div>
                  <span className="text-[10px] bg-muted/30 px-2 py-0.5 rounded-full">{lztAccounts?.length || 0}</span>
                </button>
                {lztCategories?.map((cat) => (
                  <button key={cat.id} onClick={() => { setSelectedCategory(cat.id); setSelectedTab("contas"); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${selectedCategory === cat.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}>
                    <div className="flex items-center gap-2.5">
                      {cat.icon_url ? <img src={cat.icon_url} alt="" className="h-4 w-4 rounded" /> : <Gamepad2 className="h-4 w-4" />}
                      <span className="truncate">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] bg-muted/30 px-2 py-0.5 rounded-full">{getCategoryCount(cat.id)}</span>
                      <ChevronRight className="h-3 w-3 opacity-40" />
                    </div>
                  </button>
                ))}
              </nav>
              <div className="border-t border-border/20 mt-4 pt-4">
                <h3 className="font-display text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Produtos</h3>
                <button onClick={() => { setSelectedCategory(null); setSelectedTab("produtos"); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${selectedTab === "produtos" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}>
                  <div className="flex items-center gap-2.5"><Package className="h-4 w-4" /><span>Keys & Contas</span></div>
                  <span className="text-[10px] bg-muted/30 px-2 py-0.5 rounded-full">{products?.length || 0}</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 min-h-[calc(100vh-4rem)]">
            {/* Header */}
            <div className="border-b border-border/30 bg-card/30 px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar contas, jogos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 h-10 bg-background border-border/40 rounded-xl text-sm" maxLength={100} />
                </div>
                <div className="flex items-center gap-2">
                  {selectedTab === "contas" && (
                    <>
                      <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${showFilters || activeFiltersCount > 0 ? "bg-primary/10 border-primary/30 text-primary" : "border-border/40 text-muted-foreground hover:text-foreground"}`}>
                        <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
                        {activeFiltersCount > 0 && <span className="bg-primary text-primary-foreground text-[10px] rounded-full h-4 w-4 flex items-center justify-center">{activeFiltersCount}</span>}
                      </button>
                      <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="rounded-xl border border-border/40 bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50">
                        <option value="recent">Mais recentes</option>
                        <option value="price_asc">Menor preço</option>
                        <option value="price_desc">Maior preço</option>
                      </select>
                    </>
                  )}
                  <div className="flex lg:hidden gap-2">
                    <button onClick={() => setSelectedTab("contas")} className={`px-4 py-2 rounded-xl text-xs font-display uppercase tracking-wider transition-all ${selectedTab === "contas" ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground"}`}>Contas</button>
                    <button onClick={() => setSelectedTab("produtos")} className={`px-4 py-2 rounded-xl text-xs font-display uppercase tracking-wider transition-all ${selectedTab === "produtos" ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground"}`}>Produtos</button>
                  </div>
                </div>
                {selectedTab === "contas" && (
                  <div className="flex lg:hidden flex-wrap gap-1.5 w-full">
                    <button onClick={() => setSelectedCategory(null)} className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${!selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground"}`}>Todos</button>
                    {lztCategories?.map((cat) => (
                      <button key={cat.id} onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)} className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground"}`}>{cat.name}</button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filters Panel */}
              <AnimatePresence>
                {showFilters && selectedTab === "contas" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="pt-4 flex flex-wrap items-end gap-4">
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">País</label>
                        <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)} className="rounded-xl border border-border/40 bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 min-w-[120px]">
                          <option value="">Todos</option>
                          {availableCountries.map((c) => <option key={c} value={c}>{countryFlag(c)} {c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1.5">Preço máximo (R$)</label>
                        <input type="number" value={filterPriceMax} onChange={(e) => setFilterPriceMax(e.target.value)} placeholder="Ex: 50" className="rounded-xl border border-border/40 bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-28" />
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border border-border/40 bg-background text-xs text-foreground">
                        <input type="checkbox" checked={filterSpamFree} onChange={(e) => setFilterSpamFree(e.target.checked)} className="rounded border-border accent-primary" />
                        <Shield className="h-3.5 w-3.5 text-primary" /> Sem Spam Block
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-xl border border-border/40 bg-background text-xs text-foreground">
                        <input type="checkbox" checked={filterPremium} onChange={(e) => setFilterPremium(e.target.checked)} className="rounded border-border accent-primary" />
                        <Star className="h-3.5 w-3.5 text-primary" /> Premium
                      </label>
                      {activeFiltersCount > 0 && (
                        <button onClick={() => { setFilterCountry(""); setFilterPriceMax(""); setFilterSpamFree(false); setFilterPremium(false); }} className="text-xs text-destructive hover:underline">Limpar filtros</button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="p-4 sm:p-6">
              {/* Section Title */}
              <div className="flex items-center gap-2 mb-5">
                {selectedTab === "contas" ? (
                  <>
                    <Star className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-lg text-foreground">{selectedCategory ? getCategoryName(selectedCategory) : "Todas as Contas"}</h2>
                    <Badge variant="outline" className="text-[10px] border-border/40 text-muted-foreground ml-1">{filteredAccounts?.length || 0} disponíveis</Badge>
                  </>
                ) : (
                  <>
                    <Package className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-lg text-foreground">Produtos</h2>
                    <Badge variant="outline" className="text-[10px] border-border/40 text-muted-foreground ml-1">{filteredProducts?.length || 0} disponíveis</Badge>
                  </>
                )}
              </div>

              {/* LZT Accounts Grid */}
              {selectedTab === "contas" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredAccounts?.map((account, index) => {
                      const categoryName = getCategoryName(account.category_id);
                      const inventoryInfo = extractAccountInfo(account.data, categoryName).slice(0, 4);
                      const accountImg = getAccountImage(account.data, categoryName);

                      // Valorant rank badge
                      const isValorant = categoryName.toLowerCase().includes("valorant");
                      const valRank = isValorant ? (account.data?.riot_valorant_rank || account.data?.valorant_rank || account.data?.rank) : null;
                      const valRankIcon = getValorantRankIcon(valRank);
                      const valRankName = getValorantRankName(valRank);

                      return (
                        <motion.div key={account.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: Math.min(index * 0.02, 0.3) }} className="group rounded-2xl border border-border/40 bg-card overflow-hidden hover:border-primary/30 transition-all duration-300">
                          {/* Banner Image - LZT photo or fallback */}
                          <div className="h-28 overflow-hidden relative">
                            <img
                              src={accountImg || accountBannerDefault}
                              alt=""
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              loading="lazy"
                              width={640}
                              height={512}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                              <Badge className="bg-primary/90 text-primary-foreground text-[10px] uppercase font-display tracking-wider">{categoryName}</Badge>
                              {valRankName && (
                                <Badge className="bg-background/80 backdrop-blur-sm text-[10px] border border-border/30 text-foreground flex items-center gap-1">
                                  {valRankIcon && <img src={valRankIcon} alt={valRankName} className="h-3.5 w-3.5" />}
                                  {valRankName}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="p-4 space-y-3">
                            <h3 className="font-display text-sm text-foreground font-semibold">
                              CONTA BARATA #{getShortId(account.lzt_item_id)}
                            </h3>

                            {/* Inventory Tags */}
                            {inventoryInfo.length > 0 && (
                              <div className="grid grid-cols-2 gap-1.5">
                                {inventoryInfo.map((item, i) => (
                                  <div key={i} className="flex items-center gap-1.5 text-[11px] rounded-lg bg-muted/10 px-2 py-1.5 border border-border/10">
                                    <InfoIcon type={item.icon} />
                                    <span className="text-muted-foreground truncate">{item.label}:</span>
                                    <span className="text-foreground font-medium truncate">{item.value}</span>
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-2 border-t border-border/20">
                              <span className="text-xl font-bold text-primary">R$ {Number(account.price_brl).toFixed(2)}</span>
                              <div className="flex gap-1.5">
                                <Button size="sm" variant="outline" className="text-[10px] h-8 px-2.5" onClick={() => setViewAccount(account)}>
                                  <Eye className="h-3 w-3 mr-1" /> Detalhes
                                </Button>
                                <Button size="sm" className="bg-gradient-gold text-primary-foreground text-[10px] h-8 px-3" disabled={purchasing === account.id} onClick={() => handleBuyAccount(account)}>
                                  {purchasing === account.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><ShoppingCart className="h-3 w-3 mr-1" /> Comprar</>}
                                </Button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {(!filteredAccounts || filteredAccounts.length === 0) && (
                    <div className="col-span-full text-center py-20">
                      <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground text-sm">Nenhuma conta disponível nesta categoria</p>
                      {activeFiltersCount > 0 && (
                        <button onClick={() => { setFilterCountry(""); setFilterPriceMax(""); setFilterSpamFree(false); setFilterPremium(false); }} className="text-xs text-primary hover:underline mt-2">Limpar filtros</button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Products Grid */}
              {selectedTab === "produtos" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredProducts?.map((product, index) => {
                      const lowestPrice = getLowestPrice(product.id);
                      const pvars = getProductVariations(product.id);
                      return (
                        <motion.div key={product.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: index * 0.03 }} className="group rounded-2xl border border-border/40 bg-card overflow-hidden hover:border-primary/30 transition-all duration-300 cursor-pointer" onClick={() => setSelectedProduct(selectedProduct === product.id ? null : product.id)}>
                          <div className="aspect-video bg-muted/20 relative overflow-hidden">
                            {product.image_url ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" /> : <div className="h-full w-full flex items-center justify-center"><Package className="h-10 w-10 text-muted-foreground/30" /></div>}
                            <div className="absolute top-3 left-3"><Badge className="bg-primary/90 text-primary-foreground text-[10px] uppercase font-display tracking-wider">{product.category}</Badge></div>
                            <div className="absolute top-3 right-3"><Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-[10px] border-accent/30 text-accent-foreground"><Zap className="h-3 w-3 mr-1" /> Automática</Badge></div>
                          </div>
                          <div className="p-4">
                            <h3 className="font-display text-sm text-foreground truncate">{product.name}</h3>
                            {product.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>}
                            <div className="flex items-center justify-between mt-3">
                              <div>
                                {lowestPrice !== null && <span className="text-lg font-bold text-primary">R$ {lowestPrice.toFixed(2)}</span>}
                                {pvars.length > 1 && <span className="text-[10px] text-muted-foreground ml-1">a partir de</span>}
                              </div>
                              <Button size="sm" className="bg-gradient-gold text-primary-foreground text-xs font-display"><ShoppingCart className="h-3 w-3 mr-1" /> Comprar</Button>
                            </div>
                          </div>
                          <AnimatePresence>
                            {selectedProduct === product.id && pvars.length > 0 && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-border/20">
                                <div className="p-4 space-y-2">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">Escolha a variação</p>
                                  {pvars.map((v) => {
                                    const stock = getStockCount(v.id);
                                    return (
                                      <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/20 hover:border-primary/30 transition-colors">
                                        <div className="flex items-center gap-2">
                                          <div className="p-1 rounded bg-muted/30">{v.credential_type === "key" ? <Key className="h-3 w-3 text-primary" /> : <Mail className="h-3 w-3 text-primary" />}</div>
                                          <div>
                                            <span className="text-sm text-foreground">{v.name}</span>
                                            <span className={`text-[10px] ml-2 ${stock > 0 ? "text-green-500" : "text-destructive"}`}>{stock > 0 ? `${stock} disponível` : "Esgotado"}</span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="text-right">
                                            <span className="text-sm font-bold text-primary">R$ {Number(v.price).toFixed(2)}</span>
                                            {v.original_price && <span className="text-[10px] text-muted-foreground line-through ml-1.5">R$ {Number(v.original_price).toFixed(2)}</span>}
                                          </div>
                                          <Button size="sm" className="bg-gradient-gold text-primary-foreground text-[10px]" disabled={purchasing === v.id || stock === 0} onClick={(e) => { e.stopPropagation(); handleBuyVariation(v); }}>
                                            {purchasing === v.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShoppingCart className="h-3 w-3" />}
                                          </Button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {(!filteredProducts || filteredProducts.length === 0) && (
                    <div className="col-span-full text-center py-20">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground text-sm">Nenhum produto encontrado</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <Footer />
      <FloatingChat />
    </div>
  );
};

export default Shop;
