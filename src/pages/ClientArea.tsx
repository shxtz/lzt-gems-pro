import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { withTimeout } from "@/lib/supabase-resilience";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, ShoppingBag, Settings, Camera, Lock, LogOut, Package, ChevronRight, Eye, EyeOff, Wallet } from "lucide-react";
import CredentialDisplay from "@/components/CredentialDisplay";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

type Tab = "profile" | "orders" | "security";

const ClientArea = () => {
  const { user, signOut, authReady } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam && ["profile", "orders", "security"].includes(tabParam) ? tabParam : "profile");

  useEffect(() => {
    if (tabParam && ["profile", "orders", "security"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  const [displayName, setDisplayName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["client-profile", user?.id],
    enabled: authReady && !!user,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user!.id)
            .maybeSingle(),
        );
        if (error) throw error;
        if (data) setDisplayName(data.display_name || "");
        return data;
      } catch {
        return null;
      }
    },
  });

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["client-orders", user?.id],
    enabled: authReady && !!user,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("orders")
            .select("*, vbucks_products(amount)")
            .eq("user_id", user!.id)
            .order("created_at", { ascending: false }),
        );
        if (error) throw error;
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  // Fetch delivery logs for all delivered orders
  const deliveredOrderIds = (orders ?? []).filter((o: any) => o.status === "delivered").map((o: any) => o.id);
  const { data: deliveryLogs } = useQuery({
    queryKey: ["client-delivery-logs", deliveredOrderIds],
    enabled: deliveredOrderIds.length > 0,
    retry: 1,
    refetchOnWindowFocus: false,
    staleTime: 60 * 1000,
    queryFn: async () => {
      try {
        const { data, error } = await withTimeout(
          supabase
            .from("delivery_logs")
            .select("order_id, credential_delivered")
            .in("order_id", deliveredOrderIds),
        );
        if (error) throw error;
        return data ?? [];
      } catch {
        return [];
      }
    },
  });

  const credentialsByOrderId = (deliveryLogs ?? []).reduce<Record<string, string>>((acc, log: any) => {
    acc[log.order_id] = log.credential_delivered;
    return acc;
  }, {});

  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const copyCredential = (orderId: string, credential: string) => {
    navigator.clipboard.writeText(credential);
    setCopiedOrderId(orderId);
    toast.success("Credencial copiada!");
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  const updateProfile = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ display_name: name })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-profile"] });
      toast.success("Perfil atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar perfil"),
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const validTypes = ["image/png", "image/gif"];
    if (!validTypes.includes(file.type)) {
      toast.error("Apenas PNG e GIF são aceitos");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 5MB)");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("user_id", user.id);

      queryClient.invalidateQueries({ queryKey: ["client-profile"] });
      toast.success("Foto de perfil atualizada!");
    } catch {
      toast.error("Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success("Senha alterada com sucesso!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Erro ao alterar senha");
    } finally {
      setChangingPassword(false);
    }
  };

  const tabs = [
    { id: "profile" as Tab, label: "Perfil", icon: User },
    { id: "orders" as Tab, label: "Meus Pedidos", icon: ShoppingBag },
    { id: "security" as Tab, label: "Segurança", icon: Lock },
  ];

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendente", color: "text-yellow-500 bg-yellow-500/10" },
    paid: { label: "Pago", color: "text-green-500 bg-green-500/10" },
    cancelled: { label: "Cancelado", color: "text-destructive bg-destructive/10" },
    delivered: { label: "Entregue", color: "text-primary bg-primary/10" },
    refund_needed: { label: "Reembolso Pendente", color: "text-orange-500 bg-orange-500/10" },
    refunded: { label: "Reembolsado em Saldo", color: "text-blue-500 bg-blue-500/10" },
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-28 pb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-5xl mx-auto"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
            <div className="relative group">
              <div className="h-16 w-16 rounded-2xl overflow-hidden border-2 border-border bg-card">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-primary/10">
                    <User className="h-7 w-7 text-primary" />
                  </div>
                )}
              </div>
              <label className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 group-hover:opacity-100 rounded-2xl cursor-pointer transition-opacity">
                <Camera className="h-5 w-5 text-foreground" />
                <input
                  type="file"
                  accept=".png,.gif"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            <div>
              <h1 className="font-display text-2xl text-foreground">
                {profile?.display_name || user?.email?.split("@")[0] || "Minha Conta"}
              </h1>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <div className="sm:ml-auto">
              <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Saldo</p>
                <p className="font-display text-lg text-primary">R$ {(profile?.balance || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            {/* Sidebar tabs */}
            <div className="lg:w-56 flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  <tab.icon className="h-4 w-4 shrink-0" />
                  {tab.label}
                  <ChevronRight className="h-3.5 w-3.5 ml-auto hidden lg:block" />
                </button>
              ))}
              <button
                onClick={signOut}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-all mt-2"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Sair
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                {activeTab === "profile" && (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="rounded-2xl border border-border/40 bg-card p-6 space-y-6"
                  >
                    <h2 className="font-display text-lg text-foreground">Informações do Perfil</h2>
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                          E-mail
                        </label>
                        <Input value={user?.email || ""} disabled className="bg-muted/30" />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                          Provedor de e-mail
                        </label>
                        <Input
                          value={(() => {
                            const domain = user?.email?.split("@")[1]?.toLowerCase() || "";
                            const providers: Record<string, string> = {
                              "gmail.com": "Google (Gmail)",
                              "googlemail.com": "Google (Gmail)",
                              "outlook.com": "Microsoft (Outlook)",
                              "hotmail.com": "Microsoft (Hotmail)",
                              "live.com": "Microsoft (Live)",
                              "msn.com": "Microsoft (MSN)",
                              "yahoo.com": "Yahoo Mail",
                              "yahoo.com.br": "Yahoo Mail",
                              "icloud.com": "Apple (iCloud)",
                              "me.com": "Apple (iCloud)",
                              "mac.com": "Apple (iCloud)",
                              "protonmail.com": "ProtonMail",
                              "proton.me": "ProtonMail",
                              "uol.com.br": "UOL",
                              "bol.com.br": "BOL",
                              "terra.com.br": "Terra",
                              "ig.com.br": "iG",
                              "globo.com": "Globo",
                              "zoho.com": "Zoho Mail",
                            };
                            return providers[domain] || domain || "Desconhecido";
                          })()}
                          disabled
                          className="bg-muted/30"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                          Nome de exibição
                        </label>
                        <Input
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder="Seu nick..."
                          maxLength={50}
                        />
                      </div>
                      <Button
                        onClick={() => updateProfile.mutate(displayName)}
                        disabled={updateProfile.isPending}
                        className="bg-gradient-gold text-primary-foreground hover:shadow-gold-intense"
                      >
                        {updateProfile.isPending ? "Salvando..." : "Salvar alterações"}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {activeTab === "orders" && (
                  <motion.div
                    key="orders"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="rounded-2xl border border-border/40 bg-card p-6"
                  >
                    <h2 className="font-display text-lg text-foreground mb-4">Meus Pedidos</h2>
                    {ordersLoading ? (
                      <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
                      </div>
                    ) : orders && orders.length > 0 ? (
                      <div className="space-y-3">
                        {orders.map((order: any) => {
                          const s = statusMap[order.status] || statusMap.pending;
                          const credential = credentialsByOrderId[order.id];
                          const isExpanded = expandedOrder === order.id;
                          return (
                            <div
                              key={order.id}
                              className="rounded-xl border border-border/30 bg-background/50 overflow-hidden"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  <div className="rounded-lg p-2 bg-primary/10">
                                    <Package className="h-4 w-4 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {order.vbucks_products?.amount
                                        ? `${order.vbucks_products.amount} V-Bucks`
                                        : order.lzt_item_id
                                          ? `Conta #${order.lzt_item_id}`
                                          : `Pedido #${order.id.slice(0, 8)}`}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.color}`}>
                                    {s.label}
                                  </span>
                                  <span className="text-sm font-display text-foreground">
                                    R${Number(order.total_price).toFixed(2)}
                                  </span>
                                  {credential && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                                      className="h-8 w-8 p-0"
                                    >
                                      {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                  )}
                                </div>
                              </div>
                              <AnimatePresence>
                                {isExpanded && credential && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="px-4 pb-4">
                                       <CredentialDisplay credential={credential} compact />
                                     </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-muted-foreground text-sm">Nenhum pedido encontrado</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "security" && (
                  <motion.div
                    key="security"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="rounded-2xl border border-border/40 bg-card p-6 space-y-6"
                  >
                    <h2 className="font-display text-lg text-foreground">Alterar Senha</h2>
                    <div className="space-y-4 max-w-md">
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                          Nova senha
                        </label>
                        <Input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                          Confirmar nova senha
                        </label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repita a nova senha"
                        />
                      </div>
                      <Button
                        onClick={handleChangePassword}
                        disabled={changingPassword || !newPassword}
                        className="bg-gradient-gold text-primary-foreground hover:shadow-gold-intense"
                      >
                        {changingPassword ? "Alterando..." : "Alterar senha"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default ClientArea;
