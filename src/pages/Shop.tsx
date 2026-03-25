import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search, ShoppingCart, Zap, Package, Key, Mail,
  QrCode, Copy, Check, X, Loader2, Eye, ChevronRight,
  Gamepad2, Star, Tag, SlidersHorizontal, Globe, Shield, Clock, Trophy, BarChart3,
  Send, MessageCircle, Sword, Crosshair
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
import { getLztAccountImageUrl, getLztInventoryImages } from "@/lib/lzt-image";
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

interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  icon_url: string | null;
  sort_order: number;
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

// Category-specific gradient themes and icons
const CATEGORY_THEMES: Record<string, { gradient: string; accent: string; Icon: any }> = {
  telegram: { gradient: "from-[#0088cc] via-[#0077b5] to-[#005f8d]", accent: "#0088cc", Icon: Send },
  discord: { gradient: "from-[#5865F2] via-[#4752c4] to-[#3c45a5]", accent: "#5865F2", Icon: MessageCircle },
  valorant: { gradient: "from-[#ff4655] via-[#bd3944] to-[#53212a]", accent: "#ff4655", Icon: Crosshair },
  fortnite: { gradient: "from-[#9d4dbb] via-[#7b2d9e] to-[#4a1a5e]", accent: "#9d4dbb", Icon: Sword },
  genshin: { gradient: "from-[#c8a96e] via-[#a88b4a] to-[#6b5a30]", accent: "#c8a96e", Icon: Star },
  honkai: { gradient: "from-[#6c5ce7] via-[#5a4bd1] to-[#3d2d9e]", accent: "#6c5ce7", Icon: Star },
  lol: { gradient: "from-[#c89b3c] via-[#a67c2e] to-[#785a1e]", accent: "#c89b3c", Icon: Trophy },
  steam: { gradient: "from-[#1b2838] via-[#2a475e] to-[#1b2838]", accent: "#66c0f4", Icon: Gamepad2 },
  default: { gradient: "from-primary/80 via-primary/50 to-primary/20", accent: "hsl(var(--primary))", Icon: Gamepad2 },
};

const getCategoryTheme = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  for (const [key, theme] of Object.entries(CATEGORY_THEMES)) {
    if (key !== "default" && name.includes(key)) return theme;
  }
  return CATEGORY_THEMES.default;
};

// Generate a unique seed number from item ID for visual variation
const hashId = (id: string): number => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0;
  return Math.abs(h);
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

// extractInventoryInfo is now imported from AccountDetails as extractAccountInfo

const CATEGORY_ALIASES: Record<string, string[]> = {
  valorant: ["valorant", "valorant br", "riot", "riot games"],
  "valorant-smurfs": ["valorant smurfs", "smurfs", "smurf"],
  fortnite: ["fortnite"],
  genshin: ["genshin", "genshin impact"],
  lol: ["league of legends", "lol"],
  honkai: ["honkai", "honkai star rail"],
  minecraft: ["minecraft"],
  steam: ["steam"],
  zzz: ["zenless zone zero", "zenless", "zzz"],
  discord: ["discord"],
  telegram: ["telegram"],
};

const normalizeCategoryText = (value = "") =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const resolveCategoryKey = (value = "") => {
  const normalizedValue = normalizeCategoryText(value);
  let bestMatch: { key: string; length: number } | null = null;

  for (const [key, aliases] of Object.entries(CATEGORY_ALIASES)) {
    for (const alias of aliases) {
      const normalizedAlias = normalizeCategoryText(alias);
      if ((normalizedValue === normalizedAlias || normalizedValue.includes(normalizedAlias)) && normalizedAlias.length > (bestMatch?.length ?? 0)) {
        bestMatch = { key, length: normalizedAlias.length };
      }
    }
  }

  return bestMatch?.key ?? null;
};

const isAccountCategoryCompatible = (account: LztAccount, adminCategoryName: string) => {
  const realCategory = String(account.data?.category?.category_name || account.data?.category?.category_title || "");
  if (!realCategory) return true;

  const adminKey = resolveCategoryKey(adminCategoryName);
  const realKey = resolveCategoryKey(realCategory);

  if (adminKey && realKey) return adminKey === realKey;

  const normalizedAdminCategory = normalizeCategoryText(adminCategoryName);
  const normalizedRealCategory = normalizeCategoryText(realCategory);

  return !normalizedRealCategory || normalizedAdminCategory === normalizedRealCategory || normalizedAdminCategory.includes(normalizedRealCategory);
};

const getUniqueCountries = (accounts: LztAccount[], getCategoryName: (catId: string) => string) => {
  const countries = new Set<string>();
  accounts.forEach((a) => {
    if (!isAccountCategoryCompatible(a, getCategoryName(a.category_id))) return;
    const d = a.data as any;
    const country = d?.telegram_country || d?.discord_country;
    if (country) countries.add(country);
  });
  return Array.from(countries).sort();
};

const Shop = ({ initialCategorySlug }: { initialCategorySlug?: string }) => {
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

  const { data: shopCategories } = useQuery({
    queryKey: ["shop-categories-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shop_categories").select("*").eq("visible", true).order("sort_order");
      if (error) throw error;
      return data as ShopCategory[];
    },
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

  const getCategoryName = (catId: string) =>
    lztCategories?.find((c) => c.id === catId)?.name || "Sem categoria";

  const getShopCategoryAliases = (shopCategory: ShopCategory) => {
    const aliases = [
      shopCategory.name,
      shopCategory.slug.replace(/-/g, " "),
      ...(CATEGORY_ALIASES[shopCategory.slug] ?? []),
    ];

    return Array.from(new Set(aliases.map(normalizeCategoryText).filter(Boolean)));
  };

  const getMatchingLztCategoryIds = (shopCategory: ShopCategory | null) => {
    if (!shopCategory) return [];

    const aliases = getShopCategoryAliases(shopCategory);

    return (lztCategories ?? [])
      .filter((category) => {
        const normalizedCategoryName = normalizeCategoryText(category.name);
        return aliases.some((alias) => normalizedCategoryName === alias || normalizedCategoryName.includes(alias));
      })
      .map((category) => category.id);
  };

  const selectedShopCategory = useMemo(
    () => shopCategories?.find((category) => category.slug === selectedCategory) || null,
    [shopCategories, selectedCategory]
  );

  const selectedLztCategoryIds = useMemo(
    () => new Set(getMatchingLztCategoryIds(selectedShopCategory)),
    [selectedShopCategory, lztCategories]
  );

  useEffect(() => {
    setSelectedCategory(initialCategorySlug ?? null);
    setSelectedTab("contas");
  }, [initialCategorySlug]);

  const availableCountries = useMemo(() => getUniqueCountries(lztAccounts || [], getCategoryName), [lztAccounts, lztCategories]);

  const filteredAccounts = useMemo(() => {
    let accounts = lztAccounts?.filter((a) => {
      const adminCategoryName = getCategoryName(a.category_id);
      if (!isAccountCategoryCompatible(a, adminCategoryName)) return false;

      const matchCategory = !selectedShopCategory || selectedLztCategoryIds.has(a.category_id);
      const matchSearch = !searchTerm ||
        `CONTA BARATA #${getShortId(a.lzt_item_id)}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        adminCategoryName.toLowerCase().includes(searchTerm.toLowerCase());
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
  }, [lztAccounts, selectedShopCategory, selectedLztCategoryIds, searchTerm, filterCountry, filterPriceMax, filterSpamFree, filterPremium, sortBy, lztCategories]);

  const getCategoryCount = (shopCategory: ShopCategory | null) => {
    const matchingIds = new Set(getMatchingLztCategoryIds(shopCategory));
    return lztAccounts?.filter((account) => matchingIds.has(account.category_id) && isAccountCategoryCompatible(account, getCategoryName(account.category_id))).length || 0;
  };

  const totalAccountCount = lztAccounts?.filter((account) => isAccountCategoryCompatible(account, getCategoryName(account.category_id))).length || 0;
  const getProductVariations = (productId: string) => variations?.filter((v) => v.product_id === productId) || [];
  const getLowestPrice = (productId: string) => {
    const pvars = getProductVariations(productId);
    return pvars.length === 0 ? null : Math.min(...pvars.map((v) => Number(v.price)));
  };
  const getStockCount = (variationId: string) => stockCounts?.[variationId] || 0;

  const filteredProducts = products?.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const handleBuyAccount = async (account: LztAccount) => {
    if (!user) { toast.error("Faça login para comprar"); navigate("/auth"); return; }
    setPurchasing(account.id);
    try {
      // Step 1: Check availability on LZT before anything
      const { data: checkResult, error: checkError } = await supabase.functions.invoke("lzt-purchase", {
        body: { action: "check_availability", lzt_item_id: account.lzt_item_id },
      });
      if (checkError) throw checkError;
      if (!checkResult?.available) {
        toast.error(checkResult?.reason || "Conta indisponível no LZT Market");
        // Remove from local cache
        queryClient.invalidateQueries({ queryKey: ["shop-lzt-accounts"] });
        return;
      }

      // Check if price changed on LZT
      if (checkResult.currentPriceUsd) {
        const lztCategory = lztCategories?.find((c) => c.id === account.category_id);
        const margin = lztCategory?.margin_percent || 30;
        const expectedBrl = Math.round(checkResult.currentPriceUsd * 5.5 * (1 + margin / 100) * 100) / 100;
        const priceDiff = Math.abs(expectedBrl - Number(account.price_brl));
        if (priceDiff > 0.5) {
          toast.warning(`O preço desta conta mudou! Novo preço: R$${expectedBrl.toFixed(2)}`);
          queryClient.invalidateQueries({ queryKey: ["shop-lzt-accounts"] });
          return;
        }
      }

      // Step 2: Create order + generate PIX
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
        // Find the account to get lzt_item_id
        const account = lztAccounts?.find((a) => a.id === pixData.lztAccountId);
        if (!account) { toast.error("Conta não encontrada"); return; }

        // Call fast_buy on LZT — this verifies, purchases, and delivers
        const { data: buyResult, error: buyError } = await supabase.functions.invoke("lzt-purchase", {
          body: {
            action: "fast_buy",
            lzt_item_id: account.lzt_item_id,
            account_id: pixData.lztAccountId,
            order_id: pixData.orderId,
            buyer_id: user.id,
            price_brl: pixData.amount,
          },
        });

        if (buyError) throw buyError;

        if (buyResult?.needsRefund) {
          toast.error(buyResult.error || "Erro na compra — reembolso será processado.");
          setPixData(null);
          return;
        }

        if (buyResult?.error) {
          toast.error(buyResult.error);
          return;
        }

        setDeliveredCredential({ credential: buyResult.credential, name: pixData.variationName });
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
        {viewAccount && (() => {
          const modalRealCategory = viewAccount.data?.category?.category_name || viewAccount.data?.category?.category_title || getCategoryName(viewAccount.category_id);
          return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setViewAccount(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-card border border-border/40 rounded-2xl max-w-lg w-full overflow-hidden relative">
              <button onClick={() => setViewAccount(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground z-10"><X className="h-4 w-4" /></button>

              {/* Banner - CSS dynamic or LZT image */}
              {(() => {
                const accountImg = getAccountImage(viewAccount.data, modalRealCategory);
                const theme = getCategoryTheme(modalRealCategory);
                const seed = hashId(viewAccount.lzt_item_id);
                const CategoryIcon = theme.Icon;

                const badges = (
                  <div className="absolute bottom-3 left-4 flex items-center gap-1.5 z-[2]">
                    <Badge className="bg-primary/90 text-primary-foreground text-[10px] uppercase font-display">{modalRealCategory}</Badge>
                    {modalRealCategory.toLowerCase().includes("valorant") && (() => {
                      const rank = viewAccount.data?.riot_valorant_rank || viewAccount.data?.valorant_rank || viewAccount.data?.rank;
                      const icon = getValorantRankIcon(rank);
                      const rName = getValorantRankName(rank);
                      if (!rName) return null;
                      return (
                        <Badge className="bg-background/80 backdrop-blur-sm text-[10px] border border-border/30 text-foreground flex items-center gap-1">
                          {icon && <img src={icon} alt={rName} className="h-3.5 w-3.5" />}
                          {rName}
                        </Badge>
                      );
                    })()}
                  </div>
                );

                if (accountImg) {
                  return (
                    <div className="h-36 overflow-hidden relative">
                      <img src={accountImg} alt="" className="w-full h-full object-cover" style={{ filter: "saturate(1.2) contrast(1.05)" }} />
                      <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
                      {badges}
                    </div>
                  );
                }
                return (
                  <div className={`h-36 overflow-hidden relative bg-gradient-to-br ${theme.gradient}`}>
                    <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="relative">
                        <div className="absolute rounded-full opacity-30 blur-3xl" style={{ background: theme.accent, width: 120, height: 120, left: "50%", top: "50%", transform: `translate(-50%, -50%) rotate(${seed % 360}deg)` }} />
                        <CategoryIcon className="h-16 w-16 text-white/20" strokeWidth={1} />
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                    {badges}
                  </div>
                );
              })()}

              <div className="p-6 space-y-4">
                <h3 className="font-display text-lg text-foreground">
                  CONTA BARATA #{getShortId(viewAccount.lzt_item_id)}
                </h3>

                {/* Account Details - per category */}
                <AccountDetails lztData={viewAccount.data} categoryName={modalRealCategory} />

                <div className="flex items-center justify-between pt-2 border-t border-border/20">
                  <span className="text-2xl font-bold text-primary">R$ {Number(viewAccount.price_brl).toFixed(2)}</span>
                  <Button onClick={() => { setViewAccount(null); handleBuyAccount(viewAccount); }} disabled={purchasing === viewAccount.id} className="bg-gradient-gold text-primary-foreground font-display gap-2">
                    <ShoppingCart className="h-4 w-4" /> Comprar Agora
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
          );
        })()}
      </AnimatePresence>

      <div className="pt-16">
        <div className="flex">
          {/* Sidebar */}
          <aside className="hidden lg:flex flex-col w-64 min-h-[calc(100vh-4rem)] border-r border-border/30 bg-card/50 sticky top-16 overflow-y-auto">
            <div className="p-4">
              {/* Atalhos */}
              <h3 className="font-display text-[10px] text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-primary" /> Atalhos
              </h3>
              <nav className="space-y-1 mb-5">
                <button onClick={() => navigate("/")} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all">
                  <div className="flex items-center gap-2.5"><Gamepad2 className="h-4 w-4" /><span>Loja</span></div>
                  <ChevronRight className="h-3 w-3 opacity-40" />
                </button>
                <button onClick={() => navigate("/vbucks")} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all">
                  <div className="flex items-center gap-2.5"><Zap className="h-4 w-4" /><span>V-Bucks</span></div>
                  <ChevronRight className="h-3 w-3 opacity-40" />
                </button>
              </nav>

              {/* Categorias - Dynamic from database */}
              <h3 className="font-display text-[10px] text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <Star className="h-3 w-3 text-primary" /> Categorias
              </h3>
              <nav className="space-y-1 mb-5">
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSelectedTab("contas");
                    navigate("/loja");
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                    selectedTab === "contas" && !selectedCategory
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Star className="h-4 w-4" />
                    <span>Todos</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] bg-muted/30 px-2 py-0.5 rounded-full">{totalAccountCount}</span>
                    <ChevronRight className="h-3 w-3 opacity-40" />
                  </div>
                </button>
                {shopCategories?.map((cat) => {
                  const count = getCategoryCount(cat);
                  const isActive = selectedTab === "contas" && selectedCategory === cat.slug;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategory(cat.slug);
                        setSelectedTab("contas");
                        navigate(`/contas/${cat.slug}`);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {cat.icon_url ? (
                          <img src={cat.icon_url} alt="" className="h-4 w-4 rounded" />
                        ) : (
                          <span className="text-sm">{cat.emoji || "📦"}</span>
                        )}
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {count > 0 && <span className="text-[10px] bg-muted/30 px-2 py-0.5 rounded-full">{count}</span>}
                        <ChevronRight className="h-3 w-3 opacity-40" />
                      </div>
                    </button>
                  );
                })}
              </nav>

              {/* Produtos */}
              <div className="border-t border-border/20 pt-4">
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
                    <button onClick={() => { setSelectedCategory(null); navigate("/loja"); }} className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${!selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground"}`}>Todos</button>
                    {shopCategories?.map((cat) => (
                      <button key={cat.id} onClick={() => { setSelectedCategory(cat.slug); navigate(`/contas/${cat.slug}`); }} className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${selectedCategory === cat.slug ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground"}`}>{cat.name}</button>
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
                    <h2 className="font-display text-lg text-foreground">{selectedShopCategory?.name || "Todas as Contas"}</h2>
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
                      const adminCategoryName = getCategoryName(account.category_id);
                      // Use shop category name for display badge, fallback to admin category name
                      const displayCategoryName = (() => {
                        const matchingShop = shopCategories?.find(sc => {
                          const matchingIds = getMatchingLztCategoryIds(sc);
                          return matchingIds.includes(account.category_id);
                        });
                        return matchingShop?.name || adminCategoryName;
                      })();
                      // Always use LZT's actual category for display, banners, and info extraction
                      const realCategory = account.data?.category?.category_name || account.data?.category?.category_title || adminCategoryName;
                      const inventoryInfo = extractAccountInfo(account.data, realCategory).slice(0, 4);
                      const accountImg = getAccountImage(account.data, realCategory);

                      // Valorant rank badge - only if REAL category is valorant
                      const isValorant = realCategory.toLowerCase().includes("valorant");
                      const valRank = isValorant ? (account.data?.riot_valorant_rank || account.data?.valorant_rank || account.data?.rank) : null;
                      const valRankIcon = getValorantRankIcon(valRank);
                      const valRankName = getValorantRankName(valRank);

                      return (
                        <motion.div key={account.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: Math.min(index * 0.02, 0.3) }} className="group rounded-2xl border border-border/40 bg-card overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 relative">
                          {/* Spotlight hover effect */}
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl z-[1]" style={{ background: `radial-gradient(400px circle at 50% 0%, ${getCategoryTheme(realCategory).accent}15, transparent 60%)` }} />

                          {/* Inventory Banner */}
                          {(() => {
                            const theme = getCategoryTheme(realCategory);
                            const seed = hashId(account.lzt_item_id);
                            const CategoryIcon = theme.Icon;
                            const angle = seed % 360;
                            const inv = getLztInventoryImages(account.data);
                            const hasInventory = inv.weapons || inv.agents || inv.buddies;

                            const badgeRow = (
                              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-[2]">
                                <Badge className="bg-background/70 backdrop-blur-md text-[10px] uppercase font-display tracking-wider border-0 text-foreground">{displayCategoryName}</Badge>
                                {valRankName && (
                                  <Badge className="bg-background/70 backdrop-blur-md text-[10px] border-0 text-foreground flex items-center gap-1">
                                    {valRankIcon && <img src={valRankIcon} alt={valRankName} className="h-3.5 w-3.5" />}
                                    {valRankName}
                                  </Badge>
                                )}
                              </div>
                            );

                            if (hasInventory) {
                              const inventoryItems = [
                                { src: inv.weapons, label: "Skins" },
                                { src: inv.agents, label: "Agentes" },
                                { src: inv.buddies, label: "Chaveiros" },
                              ].filter(i => i.src);

                              return (
                                <div className="relative">
                                  <div className={`h-36 overflow-hidden relative bg-gradient-to-br ${theme.gradient}`}>
                                    <div className="absolute inset-0 bg-black/40" />
                                    {/* Inventory grid */}
                                    <div className="absolute inset-0 flex">
                                      {inventoryItems.map((item, idx) => (
                                        <div key={idx} className="flex-1 relative overflow-hidden border-r border-white/5 last:border-r-0">
                                          <img
                                            src={item.src!}
                                            alt={item.label}
                                            loading="lazy"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out opacity-80 group-hover:opacity-100"
                                            style={{ filter: "saturate(1.2) contrast(1.05)" }}
                                          />
                                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
                                          <span className="absolute bottom-1.5 left-0 right-0 text-center text-[9px] font-display uppercase tracking-wider text-white/70">{item.label}</span>
                                        </div>
                                      ))}
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent pointer-events-none" />
                                    {badgeRow}
                                  </div>
                                </div>
                              );
                            }

                            if (accountImg) {
                              return (
                                <div className="h-36 overflow-hidden relative">
                                  <img src={accountImg} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" loading="lazy" style={{ filter: "saturate(1.15) contrast(1.05)" }} />
                                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                                  {badgeRow}
                                </div>
                              );
                            }

                            return (
                              <div className={`h-36 overflow-hidden relative bg-gradient-to-br ${theme.gradient}`}>
                                <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3C/g%3E%3C/svg%3E\")" }} />
                                <div className="absolute opacity-25 blur-2xl rounded-full group-hover:opacity-40 transition-opacity duration-700" style={{ background: `radial-gradient(circle, ${theme.accent}, transparent)`, width: 100, height: 100, left: `${30 + (seed % 40)}%`, top: `${10 + (seed % 50)}%` }} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <CategoryIcon className="h-12 w-12 text-white/10 group-hover:text-white/20 transition-all duration-500 group-hover:scale-110" strokeWidth={1} style={{ transform: `rotate(${angle % 20 - 10}deg)` }} />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                                {badgeRow}
                              </div>
                            );
                          })()}

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
                                <Button size="sm" variant="outline" className="text-[10px] h-8 px-2.5" onClick={() => navigate(`/preview/${account.id}`)}>
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
