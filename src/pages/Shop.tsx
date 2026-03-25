import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import {
  Search, ShoppingCart, Zap, Package, Key, Mail,
  QrCode, Copy, Check, X, Loader2, Eye, ChevronRight,
  Gamepad2, Star, Tag
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

  // LZT Data
  const { data: lztCategories } = useQuery({
    queryKey: ["shop-lzt-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lzt_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as LztCategory[];
    },
  });

  const { data: lztAccounts } = useQuery({
    queryKey: ["shop-lzt-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lzt_accounts")
        .select("*")
        .eq("status", "available")
        .order("imported_at", { ascending: false });
      if (error) throw error;
      return data as LztAccount[];
    },
    refetchInterval: 30000,
  });

  // Products Data
  const { data: products } = useQuery({
    queryKey: ["shop-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: variations } = useQuery({
    queryKey: ["shop-variations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variations")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as Variation[];
    },
  });

  const { data: stockCounts } = useQuery({
    queryKey: ["shop-stock-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_stock")
        .select("variation_id")
        .eq("status", "available");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((s) => {
        counts[s.variation_id] = (counts[s.variation_id] || 0) + 1;
      });
      return counts;
    },
    refetchInterval: 15000,
  });

  // Filtered LZT accounts
  const filteredAccounts = lztAccounts?.filter((a) => {
    const matchCategory = !selectedCategory || a.category_id === selectedCategory;
    const matchSearch = !searchTerm || a.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  // Count per category
  const getCategoryCount = (catId: string) =>
    lztAccounts?.filter((a) => a.category_id === catId).length || 0;

  // Products helpers
  const getProductVariations = (productId: string) =>
    variations?.filter((v) => v.product_id === productId) || [];
  const getLowestPrice = (productId: string) => {
    const pvars = getProductVariations(productId);
    if (pvars.length === 0) return null;
    return Math.min(...pvars.map((v) => Number(v.price)));
  };
  const getStockCount = (variationId: string) => stockCounts?.[variationId] || 0;

  const filteredProducts = products?.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !selectedCategory || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const productCategories = [...new Set(products?.map((p) => p.category) || [])];

  // Buy LZT account
  const handleBuyAccount = async (account: LztAccount) => {
    if (!user) {
      toast.error("Faça login para comprar");
      navigate("/auth");
      return;
    }

    setPurchasing(account.id);
    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          quantity: 1,
          total_price: account.price_brl,
          payment_method: "pix",
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const { data: pixResponse, error: pixError } = await supabase.functions.invoke("create-pix-charge", {
        body: {
          orderId: order.id,
          amount: account.price_brl,
          description: `${account.title || "Conta"} - Loja`,
        },
      });

      if (pixError) throw pixError;
      if (pixResponse?.error) throw new Error(pixResponse.error);

      await supabase
        .from("orders")
        .update({ payment_id: pixResponse.txid })
        .eq("id", order.id);

      setPixData({
        qrcode: pixResponse.qrcode,
        copiaecola: pixResponse.copiaecola,
        txid: pixResponse.txid,
        orderId: order.id,
        variationName: account.title || "Conta",
        amount: account.price_brl,
        lztAccountId: account.id,
      });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar pagamento PIX.");
    } finally {
      setPurchasing(null);
    }
  };

  // Buy product variation
  const handleBuyVariation = async (variation: Variation) => {
    if (!user) {
      toast.error("Faça login para comprar");
      navigate("/auth");
      return;
    }
    const stock = getStockCount(variation.id);
    if (stock === 0) {
      toast.error("Produto sem estoque disponível");
      return;
    }
    setPurchasing(variation.id);
    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          product_id: variation.product_id,
          quantity: 1,
          total_price: Number(variation.price),
          payment_method: "pix",
          status: "pending",
        })
        .select()
        .single();
      if (orderError) throw orderError;

      const { data: pixResponse, error: pixError } = await supabase.functions.invoke("create-pix-charge", {
        body: {
          orderId: order.id,
          amount: Number(variation.price),
          description: `${variation.name} - Loja Digital`,
        },
      });
      if (pixError) throw pixError;
      if (pixResponse?.error) throw new Error(pixResponse.error);

      await supabase
        .from("orders")
        .update({ payment_id: pixResponse.txid })
        .eq("id", order.id);

      setPixData({
        qrcode: pixResponse.qrcode,
        copiaecola: pixResponse.copiaecola,
        txid: pixResponse.txid,
        orderId: order.id,
        variationId: variation.id,
        variationName: variation.name,
        amount: Number(variation.price),
      });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar pagamento PIX.");
    } finally {
      setPurchasing(null);
    }
  };

  // Confirm payment
  const confirmPaymentAndDeliver = async () => {
    if (!pixData || !user) return;
    setCheckingPayment(true);
    try {
      if (pixData.variationId) {
        const { data, error } = await supabase.functions.invoke("deliver-product", {
          body: {
            variationId: pixData.variationId,
            buyerId: user.id,
            orderId: pixData.orderId,
          },
        });
        if (error) throw error;
        if (data.error) { toast.error(data.error); return; }
        await supabase.from("orders").update({ status: "paid" }).eq("id", pixData.orderId);
        setDeliveredCredential({ credential: data.credential, name: pixData.variationName });
      } else if (pixData.lztAccountId) {
        // Mark LZT account as sold
        const { error } = await supabase
          .from("lzt_accounts")
          .update({
            status: "sold",
            buyer_id: user.id,
            sold_at: new Date().toISOString(),
            sold_price: pixData.amount,
          })
          .eq("id", pixData.lztAccountId)
          .eq("status", "available");

        if (error) throw error;

        await supabase.from("orders").update({ status: "paid" }).eq("id", pixData.orderId);

        // Get account data for delivery
        const { data: soldAccount } = await supabase
          .from("lzt_accounts")
          .select("*")
          .eq("id", pixData.lztAccountId)
          .single();

        const credentialInfo = soldAccount?.data
          ? JSON.stringify(soldAccount.data, null, 2)
          : "Conta entregue - verifique sua área do cliente";

        setDeliveredCredential({ credential: credentialInfo, name: pixData.variationName });
        queryClient.invalidateQueries({ queryKey: ["shop-lzt-accounts"] });
      }

      setPixData(null);
      toast.success("Pagamento confirmado! Produto entregue.");
    } catch {
      toast.error("Erro ao confirmar pagamento.");
    } finally {
      setCheckingPayment(false);
    }
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

  const getCategoryName = (catId: string) =>
    lztCategories?.find((c) => c.id === catId)?.name || "Sem categoria";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* PIX Modal */}
      <AnimatePresence>
        {pixData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-primary/30 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-gold relative"
            >
              <button onClick={() => setPixData(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-lg text-foreground">Pagamento PIX</h3>
                <p className="text-xs text-muted-foreground mt-1">{pixData.variationName}</p>
                <p className="text-lg font-bold text-primary mt-2">R$ {pixData.amount.toFixed(2)}</p>
              </div>
              {pixData.qrcode && (
                <div className="bg-white rounded-xl p-4 mx-auto w-fit">
                  <img
                    src={pixData.qrcode.startsWith("data:") ? pixData.qrcode : `data:image/png;base64,${pixData.qrcode}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
              )}
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-display">Copia e Cola</p>
                <div className="flex gap-2">
                  <input readOnly value={pixData.copiaecola} className="flex-1 rounded-xl border border-border/40 bg-background px-3 py-2.5 text-xs text-foreground font-mono truncate" />
                  <Button size="sm" variant="outline" onClick={copyPix} className="shrink-0">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeliveredCredential(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-primary/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-gold"
            >
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
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
              <p className="text-[10px] text-muted-foreground text-center">Guarde em um lugar seguro.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Account Detail Modal */}
      <AnimatePresence>
        {viewAccount && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewAccount(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-card border border-border/40 rounded-2xl p-6 max-w-lg w-full space-y-4 relative"
            >
              <button onClick={() => setViewAccount(null)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
              <div>
                <Badge className="bg-primary/90 text-primary-foreground text-[10px] uppercase font-display mb-2">
                  {getCategoryName(viewAccount.category_id)}
                </Badge>
                <h3 className="font-display text-lg text-foreground">{viewAccount.title || `Conta #${viewAccount.lzt_item_id}`}</h3>
              </div>

              {viewAccount.data && typeof viewAccount.data === "object" && (
                <div className="rounded-xl bg-muted/10 border border-border/20 p-4 space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(viewAccount.data as Record<string, any>).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                      <span className="text-foreground font-medium truncate max-w-[200px]">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-2xl font-bold text-primary">R$ {Number(viewAccount.price_brl).toFixed(2)}</span>
                </div>
                <Button
                  onClick={() => { setViewAccount(null); handleBuyAccount(viewAccount); }}
                  disabled={purchasing === viewAccount.id}
                  className="bg-gradient-gold text-primary-foreground font-display gap-2"
                >
                  <ShoppingCart className="h-4 w-4" />
                  Comprar Agora
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-16">
        <div className="flex">
          {/* Sidebar - Categories */}
          <aside className="hidden lg:flex flex-col w-64 min-h-[calc(100vh-4rem)] border-r border-border/30 bg-card/50 sticky top-16 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-display text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Categorias</h3>
              <nav className="space-y-1">
                <button
                  onClick={() => { setSelectedCategory(null); setSelectedTab("contas"); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                    !selectedCategory && selectedTab === "contas"
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Gamepad2 className="h-4 w-4" />
                    <span>Todas as Contas</span>
                  </div>
                  <span className="text-[10px] bg-muted/30 px-2 py-0.5 rounded-full">{lztAccounts?.length || 0}</span>
                </button>

                {lztCategories?.map((cat) => {
                  const count = getCategoryCount(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); setSelectedTab("contas"); }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                        selectedCategory === cat.id
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        {cat.icon_url ? (
                          <img src={cat.icon_url} alt="" className="h-4 w-4 rounded" />
                        ) : (
                          <Gamepad2 className="h-4 w-4" />
                        )}
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-muted/30 px-2 py-0.5 rounded-full">{count}</span>
                        <ChevronRight className="h-3 w-3 opacity-40" />
                      </div>
                    </button>
                  );
                })}
              </nav>

              <div className="border-t border-border/20 mt-4 pt-4">
                <h3 className="font-display text-[10px] text-muted-foreground uppercase tracking-widest mb-3">Produtos</h3>
                <button
                  onClick={() => { setSelectedCategory(null); setSelectedTab("produtos"); }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all ${
                    selectedTab === "produtos"
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Package className="h-4 w-4" />
                    <span>Keys & Contas</span>
                  </div>
                  <span className="text-[10px] bg-muted/30 px-2 py-0.5 rounded-full">{products?.length || 0}</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-h-[calc(100vh-4rem)]">
            {/* Header */}
            <div className="border-b border-border/30 bg-card/30 px-4 sm:px-6 py-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full sm:max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar contas, jogos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 bg-background border-border/40 rounded-xl text-sm"
                    maxLength={100}
                  />
                </div>

                {/* Mobile tabs */}
                <div className="flex lg:hidden gap-2">
                  <button
                    onClick={() => setSelectedTab("contas")}
                    className={`px-4 py-2 rounded-xl text-xs font-display uppercase tracking-wider transition-all ${
                      selectedTab === "contas" ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground"
                    }`}
                  >
                    Contas
                  </button>
                  <button
                    onClick={() => setSelectedTab("produtos")}
                    className={`px-4 py-2 rounded-xl text-xs font-display uppercase tracking-wider transition-all ${
                      selectedTab === "produtos" ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground"
                    }`}
                  >
                    Produtos
                  </button>
                </div>

                {/* Mobile category filter */}
                {selectedTab === "contas" && (
                  <div className="flex lg:hidden flex-wrap gap-1.5 w-full">
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${
                        !selectedCategory ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground"
                      }`}
                    >
                      Todos
                    </button>
                    {lztCategories?.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                        className={`px-3 py-1 rounded-full text-[10px] font-medium transition-all ${
                          selectedCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-muted/20 text-muted-foreground"
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Section Title */}
              <div className="flex items-center gap-2 mb-5">
                {selectedTab === "contas" ? (
                  <>
                    <Star className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-lg text-foreground">
                      {selectedCategory ? getCategoryName(selectedCategory) : "Todas as Contas"}
                    </h2>
                    <Badge variant="outline" className="text-[10px] border-border/40 text-muted-foreground ml-1">
                      {filteredAccounts?.length || 0} disponíveis
                    </Badge>
                  </>
                ) : (
                  <>
                    <Package className="h-5 w-5 text-primary" />
                    <h2 className="font-display text-lg text-foreground">Produtos</h2>
                    <Badge variant="outline" className="text-[10px] border-border/40 text-muted-foreground ml-1">
                      {filteredProducts?.length || 0} disponíveis
                    </Badge>
                  </>
                )}
              </div>

              {/* LZT Accounts Grid */}
              {selectedTab === "contas" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                  <AnimatePresence mode="popLayout">
                    {filteredAccounts?.map((account, index) => (
                      <motion.div
                        key={account.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: index * 0.03 }}
                        className="group rounded-2xl border border-border/40 bg-card overflow-hidden hover:border-primary/30 transition-all duration-300"
                      >
                        {/* Card Header */}
                        <div className="bg-muted/10 px-4 py-3 flex items-center justify-between border-b border-border/20">
                          <Badge className="bg-primary/90 text-primary-foreground text-[10px] uppercase font-display tracking-wider">
                            {getCategoryName(account.category_id)}
                          </Badge>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Zap className="h-3 w-3 text-green-500" />
                            <span className="text-[10px] text-green-500 font-medium">Automática</span>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-3">
                          <h3 className="font-display text-sm text-foreground line-clamp-2 min-h-[2.5rem]">
                            {account.title || `Conta #${account.lzt_item_id}`}
                          </h3>

                          {/* Quick Info from data */}
                          {account.data && typeof account.data === "object" && (
                            <div className="space-y-1">
                              {Object.entries(account.data as Record<string, any>).slice(0, 3).map(([key, value]) => (
                                <div key={key} className="flex justify-between text-[11px]">
                                  <span className="text-muted-foreground capitalize truncate mr-2">{key.replace(/_/g, " ")}</span>
                                  <span className="text-foreground font-medium truncate max-w-[120px]">{String(value)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Price & Actions */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/20">
                            <span className="text-xl font-bold text-primary">
                              R$ {Number(account.price_brl).toFixed(2)}
                            </span>
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-[10px] h-8 px-2.5"
                                onClick={() => setViewAccount(account)}
                              >
                                <Eye className="h-3 w-3 mr-1" /> Detalhes
                              </Button>
                              <Button
                                size="sm"
                                className="bg-gradient-gold text-primary-foreground text-[10px] h-8 px-3"
                                disabled={purchasing === account.id}
                                onClick={() => handleBuyAccount(account)}
                              >
                                {purchasing === account.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <><ShoppingCart className="h-3 w-3 mr-1" /> Comprar</>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {(!filteredAccounts || filteredAccounts.length === 0) && (
                    <div className="col-span-full text-center py-20">
                      <Gamepad2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                      <p className="text-muted-foreground text-sm">Nenhuma conta disponível nesta categoria</p>
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
                        <motion.div
                          key={product.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          transition={{ delay: index * 0.03 }}
                          className="group rounded-2xl border border-border/40 bg-card overflow-hidden hover:border-primary/30 transition-all duration-300 cursor-pointer"
                          onClick={() => setSelectedProduct(selectedProduct === product.id ? null : product.id)}
                        >
                          {/* Image */}
                          <div className="aspect-video bg-muted/20 relative overflow-hidden">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center"><Package className="h-10 w-10 text-muted-foreground/30" /></div>
                            )}
                            <div className="absolute top-3 left-3">
                              <Badge className="bg-primary/90 text-primary-foreground text-[10px] uppercase font-display tracking-wider">{product.category}</Badge>
                            </div>
                            <div className="absolute top-3 right-3">
                              <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-[10px] border-accent/30 text-accent-foreground">
                                <Zap className="h-3 w-3 mr-1" /> Automática
                              </Badge>
                            </div>
                          </div>

                          <div className="p-4">
                            <h3 className="font-display text-sm text-foreground truncate">{product.name}</h3>
                            {product.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>}
                            <div className="flex items-center justify-between mt-3">
                              <div>
                                {lowestPrice !== null && <span className="text-lg font-bold text-primary">R$ {lowestPrice.toFixed(2)}</span>}
                                {pvars.length > 1 && <span className="text-[10px] text-muted-foreground ml-1">a partir de</span>}
                              </div>
                              <Button size="sm" className="bg-gradient-gold text-primary-foreground text-xs font-display">
                                <ShoppingCart className="h-3 w-3 mr-1" /> Comprar
                              </Button>
                            </div>
                          </div>

                          {/* Expanded Variations */}
                          <AnimatePresence>
                            {selectedProduct === product.id && pvars.length > 0 && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="border-t border-border/20"
                              >
                                <div className="p-4 space-y-2">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-display">Escolha a variação</p>
                                  {pvars.map((v) => {
                                    const stock = getStockCount(v.id);
                                    return (
                                      <div key={v.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/20 hover:border-primary/30 transition-colors">
                                        <div className="flex items-center gap-2">
                                          <div className="p-1 rounded bg-muted/30">
                                            {v.credential_type === "key" ? <Key className="h-3 w-3 text-primary" /> : <Mail className="h-3 w-3 text-primary" />}
                                          </div>
                                          <div>
                                            <span className="text-sm text-foreground">{v.name}</span>
                                            <span className={`text-[10px] ml-2 ${stock > 0 ? "text-green-500" : "text-destructive"}`}>
                                              {stock > 0 ? `${stock} disponível` : "Esgotado"}
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <div className="text-right">
                                            <span className="text-sm font-bold text-primary">R$ {Number(v.price).toFixed(2)}</span>
                                            {v.original_price && <span className="text-[10px] text-muted-foreground line-through ml-1.5">R$ {Number(v.original_price).toFixed(2)}</span>}
                                          </div>
                                          <Button
                                            size="sm"
                                            className="bg-gradient-gold text-primary-foreground text-[10px]"
                                            disabled={purchasing === v.id || stock === 0}
                                            onClick={(e) => { e.stopPropagation(); handleBuyVariation(v); }}
                                          >
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
