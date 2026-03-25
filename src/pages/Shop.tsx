import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Search, ShoppingCart, Zap, Package, Key, Mail, QrCode, Copy, Check, X, Loader2 } from "lucide-react";
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

interface StockCount {
  variation_id: string;
  count: number;
}

interface PixData {
  qrcode: string;
  copiaecola: string;
  txid: string;
  orderId: string;
  variationId: string;
  variationName: string;
  amount: number;
}

const Shop = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [copied, setCopied] = useState(false);
  const [deliveredCredential, setDeliveredCredential] = useState<{ credential: string; variationName: string } | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

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

  const categories = [...new Set(products?.map((p) => p.category) || [])];

  const filteredProducts = products?.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategory = !selectedCategory || p.category === selectedCategory;
    return matchSearch && matchCategory;
  });

  const getProductVariations = (productId: string) =>
    variations?.filter((v) => v.product_id === productId) || [];

  const getLowestPrice = (productId: string) => {
    const pvars = getProductVariations(productId);
    if (pvars.length === 0) return null;
    return Math.min(...pvars.map((v) => Number(v.price)));
  };

  const getStockCount = (variationId: string) => stockCounts?.[variationId] || 0;

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
      // 1. Create order
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

      // 2. Generate PIX charge
      const { data: pixResponse, error: pixError } = await supabase.functions.invoke("create-pix-charge", {
        body: {
          orderId: order.id,
          amount: Number(variation.price),
          description: `${variation.name} - Loja Digital`,
        },
      });

      if (pixError) throw pixError;
      if (pixResponse?.error) throw new Error(pixResponse.error);

      // 3. Update order with payment ID
      await supabase
        .from("orders")
        .update({ payment_id: pixResponse.txid })
        .eq("id", order.id);

      // 4. Show PIX modal
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
      toast.error("Erro ao gerar pagamento PIX. Tente novamente.");
    } finally {
      setPurchasing(null);
    }
  };

  const confirmPaymentAndDeliver = async () => {
    if (!pixData || !user) return;
    setCheckingPayment(true);

    try {
      // Call deliver-product to consume stock and deliver
      const { data, error } = await supabase.functions.invoke("deliver-product", {
        body: {
          variationId: pixData.variationId,
          buyerId: user.id,
          orderId: pixData.orderId,
        },
      });

      if (error) throw error;
      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Update order status to paid
      await supabase
        .from("orders")
        .update({ status: "paid" })
        .eq("id", pixData.orderId);

      setDeliveredCredential({
        credential: data.credential,
        variationName: pixData.variationName,
      });
      setPixData(null);
      toast.success("Pagamento confirmado! Produto entregue.");
    } catch {
      toast.error("Erro ao confirmar pagamento. Tente novamente.");
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* PIX Payment Modal */}
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
              <button
                onClick={() => setPixData(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
              >
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
                  <input
                    readOnly
                    value={pixData.copiaecola}
                    className="flex-1 rounded-xl border border-border/40 bg-background px-3 py-2.5 text-xs text-foreground font-mono truncate"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyPix}
                    className="shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                onClick={confirmPaymentAndDeliver}
                disabled={checkingPayment}
                className="w-full bg-gradient-gold text-primary-foreground font-display"
              >
                {checkingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirmando...
                  </>
                ) : (
                  "Já paguei - Confirmar"
                )}
              </Button>

              <p className="text-[10px] text-muted-foreground text-center">
                Após pagar, clique em "Já paguei" para receber sua credencial instantaneamente.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delivered Credential Modal */}
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
                <p className="text-xs text-muted-foreground mt-1">{deliveredCredential.variationName}</p>
              </div>

              <div className="rounded-xl bg-muted/20 border border-border/30 p-4">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-display">Sua credencial</p>
                <p className="text-sm text-foreground font-mono break-all select-all">{deliveredCredential.credential}</p>
              </div>

              <div className="flex gap-2">
                <Button onClick={copyCredential} className="flex-1 bg-gradient-gold text-primary-foreground">
                  Copiar Credencial
                </Button>
                <Button variant="outline" onClick={() => setDeliveredCredential(null)}>
                  Fechar
                </Button>
              </div>

              <p className="text-[10px] text-muted-foreground text-center">
                Guarde esta credencial em um lugar seguro. Ela não será exibida novamente.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="font-display text-3xl md:text-4xl text-gradient-gold text-center"
            >
              Loja
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center text-muted-foreground mt-2 text-sm"
            >
              Contas e keys com entrega automática instantânea
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8 max-w-2xl mx-auto"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-12 bg-card border-border/40 rounded-xl text-sm"
                  maxLength={100}
                />
              </div>

              {categories.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                      !selectedCategory
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    Todos
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                        selectedCategory === cat
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            <AnimatePresence mode="popLayout">
              {filteredProducts?.map((product, index) => {
                const lowestPrice = getLowestPrice(product.id);
                const pvars = getProductVariations(product.id);

                return (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="group rounded-2xl border border-border/40 bg-card overflow-hidden hover:border-primary/30 transition-all duration-300 hover:shadow-card-hover cursor-pointer"
                    onClick={() => setSelectedProduct(selectedProduct === product.id ? null : product.id)}
                  >
                    {/* Image */}
                    <div className="aspect-video bg-muted/20 relative overflow-hidden">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Package className="h-10 w-10 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="absolute top-3 left-3">
                        <Badge className="bg-primary/90 text-primary-foreground text-[10px] uppercase font-display tracking-wider">
                          {product.category}
                        </Badge>
                      </div>
                      <div className="absolute top-3 right-3">
                        <Badge variant="outline" className="bg-background/80 backdrop-blur-sm text-[10px] border-accent/30 text-accent-foreground">
                          <Zap className="h-3 w-3 mr-1" /> Automática
                        </Badge>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-display text-sm text-foreground truncate">{product.name}</h3>
                      {product.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{product.description}</p>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <div>
                          {lowestPrice !== null && (
                            <span className="text-lg font-bold text-primary">
                              R$ {lowestPrice.toFixed(2)}
                            </span>
                          )}
                          {pvars.length > 1 && (
                            <span className="text-[10px] text-muted-foreground ml-1">a partir de</span>
                          )}
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
                                <div
                                  key={v.id}
                                  className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/20 hover:border-primary/30 transition-colors"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="p-1 rounded bg-muted/30">
                                      {v.credential_type === "key" ? (
                                        <Key className="h-3 w-3 text-primary" />
                                      ) : (
                                        <Mail className="h-3 w-3 text-primary" />
                                      )}
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
                                      {v.original_price && (
                                        <span className="text-[10px] text-muted-foreground line-through ml-1.5">
                                          R$ {Number(v.original_price).toFixed(2)}
                                        </span>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      className="bg-gradient-gold text-primary-foreground text-[10px]"
                                      disabled={purchasing === v.id || stock === 0}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleBuyVariation(v);
                                      }}
                                    >
                                      {purchasing === v.id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <ShoppingCart className="h-3 w-3" />
                                      )}
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
          </div>

          {(!filteredProducts || filteredProducts.length === 0) && (
            <div className="text-center py-20">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-sm">Nenhum produto encontrado</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
      <FloatingChat />
    </div>
  );
};

export default Shop;
