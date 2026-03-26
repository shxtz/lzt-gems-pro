import { useState } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, ShoppingBag, QrCode, Copy, Check, ArrowLeft } from "lucide-react";
import logo from "@/assets/logo.png";
import vbucksIcon from "@/assets/vbucks-icon.png";
import CrossSellBanner from "@/components/marketing/CrossSellBanner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Checkout = () => {
  const { items, removeItem, clearCart, totalPrice } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fortniteUsername, setFortniteUsername] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponId, setCouponId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrcode: string; copiaecola: string; txid: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const finalPrice = totalPrice * (1 - discount / 100);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode.toUpperCase())
      .eq("active", true)
      .maybeSingle();

    if (data) {
      setDiscount(data.discount_percent);
      setCouponId(data.id);
      toast.success(`Cupom aplicado! ${data.discount_percent}% de desconto`);
    } else {
      toast.error("Cupom inválido ou expirado");
    }
  };

  const handleCheckout = async () => {
    if (!user) {
      toast.error("Faça login para continuar");
      navigate("/auth");
      return;
    }
    if (!fortniteUsername.trim()) {
      toast.error("Informe seu nome de usuário do Fortnite");
      return;
    }
    if (items.length === 0) return;

    setLoading(true);
    try {
      // Create order
      const item = items[0];
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          product_id: item.productId,
          quantity: item.quantity,
          total_price: finalPrice,
          fortnite_username: fortniteUsername,
          coupon_id: couponId,
          payment_method: "pix",
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create PIX charge
      const { data: pixResponse, error: pixError } = await supabase.functions.invoke("create-pix-charge", {
        body: {
          orderId: order.id,
          amount: finalPrice,
          description: `${item.amount} V-Bucks - VBucks Barato`,
        },
      });

      if (pixError) throw pixError;

      setPixData({
        qrcode: pixResponse.qrcode,
        copiaecola: pixResponse.copiaecola,
        txid: pixResponse.txid,
      });

      // Update order with payment ID
      await supabase
        .from("orders")
        .update({ payment_id: pixResponse.txid })
        .eq("id", order.id);

      toast.success("Cobrança PIX gerada!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar pagamento. Tente novamente.");
    }
    setLoading(false);
  };

  const copyPix = () => {
    if (pixData?.copiaecola) {
      navigator.clipboard.writeText(pixData.copiaecola);
      setCopied(true);
      toast.success("Código PIX copiado!");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (items.length === 0 && !pixData) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center px-4 pt-28 pb-16">
          <div className="text-center">
            <ShoppingBag className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-display text-2xl text-foreground mb-2">Carrinho vazio</h1>
            <p className="font-body text-sm text-muted-foreground mb-6">Adicione V-Bucks ao carrinho para continuar</p>
            <button onClick={() => navigate("/")} className="rounded-xl bg-gradient-gold px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-primary-foreground">
              Ver Produtos
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="px-4 pt-24 pb-16">
        <div className="max-w-2xl mx-auto">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="font-body text-sm">Voltar</span>
          </button>

          <div className="text-center mb-8">
            <img src={logo} alt="VBucks Barato" className="h-12 w-12 mx-auto mb-3" />
            <h1 className="font-display text-2xl text-gradient-gold">CHECKOUT</h1>
          </div>

        {!pixData ? (
          <div className="space-y-6">
            {/* Cart Items */}
            <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-3">
              <h2 className="font-display text-sm text-foreground uppercase tracking-wider">Itens</h2>
              {items.map((item) => (
                <div key={item.productId} className="flex items-center justify-between py-3 border-b border-border/20 last:border-0">
                  <div className="flex items-center gap-3">
                    <img src={vbucksIcon} alt="V-Bucks" className="h-8 w-8" />
                    <div>
                      <p className="font-display text-sm text-foreground">{item.amount.toLocaleString("pt-BR")} V-Bucks</p>
                      <p className="font-body text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm text-foreground">R${(item.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeItem(item.productId)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Fortnite Username */}
            <div className="rounded-2xl border border-border/40 bg-card p-5">
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Nome de usuário do Fortnite (Epic Games)
              </label>
              <input
                value={fortniteUsername}
                onChange={(e) => setFortniteUsername(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="SeuNickFortnite"
                required
              />
            </div>

            {/* Coupon */}
            <div className="rounded-2xl border border-border/40 bg-card p-5">
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Cupom de desconto
              </label>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className="flex-1 rounded-xl border border-border/40 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="CODIGO"
                />
                <button onClick={applyCoupon} className="rounded-xl border border-primary/30 px-5 py-3 font-display text-xs font-bold text-primary uppercase tracking-wider hover:bg-primary/10 transition-colors">
                  Aplicar
                </button>
              </div>
              {discount > 0 && (
                <p className="mt-2 text-xs text-green-500 font-medium">✓ Desconto de {discount}% aplicado</p>
              )}
            </div>

            {/* Summary */}
            <div className="rounded-2xl border border-border/40 bg-card p-5 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">R${totalPrice.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-500">Desconto ({discount}%)</span>
                  <span className="text-green-500">-R${(totalPrice * discount / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-border/20 pt-2 flex justify-between">
                <span className="font-display text-sm text-foreground uppercase">Total</span>
                <span className="font-display text-xl text-gradient-gold">R${finalPrice.toFixed(2)}</span>
              </div>
            </div>

            {/* Pay Button */}
            <motion.button
              onClick={handleCheckout}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-gold px-6 py-4 font-display text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-gold disabled:opacity-50"
            >
              <QrCode className="h-5 w-5" />
              {loading ? "Gerando PIX..." : "Pagar com PIX"}
            </motion.button>

            {/* Cross-sell */}
            <CrossSellBanner context="checkout" />
          </div>
        ) : (
          /* PIX Payment Screen */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-primary/30 bg-card p-8 text-center space-y-6"
          >
            <div>
              <QrCode className="h-12 w-12 text-primary mx-auto mb-3" />
              <h2 className="font-display text-xl text-foreground">Pagamento PIX</h2>
              <p className="font-body text-sm text-muted-foreground mt-1">
                Escaneie o QR Code ou copie o código
              </p>
            </div>

            {pixData.qrcode && (
              <div className="bg-white rounded-xl p-4 inline-block mx-auto">
                <img src={`data:image/png;base64,${pixData.qrcode}`} alt="QR Code PIX" className="w-48 h-48" />
              </div>
            )}

            <div>
              <p className="font-body text-xs text-muted-foreground mb-2">Código PIX Copia e Cola:</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={pixData.copiaecola}
                  className="flex-1 rounded-xl border border-border/40 bg-background px-4 py-3 text-xs text-foreground font-mono truncate"
                />
                <motion.button
                  onClick={copyPix}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-xl bg-primary/10 px-4 py-3 text-primary hover:bg-primary/20 transition-colors"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </motion.button>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>Valor: <span className="text-foreground font-medium">R${finalPrice.toFixed(2)}</span></p>
              <p className="mt-1">Após o pagamento, os V-Bucks serão enviados automaticamente.</p>
            </div>

            <button
              onClick={() => { clearCart(); navigate("/"); }}
              className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Voltar ao início
            </button>
          </motion.div>
        )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Checkout;
