import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Copy, Check, X, Eye, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const AdminOrders = () => {
  const queryClient = useQueryClient();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
  });

  const { data: deliveryLogs } = useQuery({
    queryKey: ["admin-delivery-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_logs")
        .select("order_id, credential_delivered, delivered_at")
        .order("delivered_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, email, display_name, discord_id");
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Status atualizado!");
    },
  });

  const refundToBalance = useMutation({
    mutationFn: async ({ orderId, userId, amount }: { orderId: string; userId: string; amount: number }) => {
      // 1. Add balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance")
        .eq("user_id", userId)
        .single();
      const newBalance = Number(profile?.balance || 0) + amount;
      const { error: balErr } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", userId);
      if (balErr) throw balErr;

      // 2. Record transaction
      const { error: txErr } = await supabase.from("balance_transactions").insert({
        user_id: userId,
        amount: amount,
        type: "refund",
        description: `Reembolso em saldo - pedido #${orderId.slice(0, 8)}`,
      });
      if (txErr) throw txErr;

      // 3. Update order status
      const { error: orderErr } = await supabase
        .from("orders")
        .update({ status: "refunded", updated_at: new Date().toISOString() })
        .eq("id", orderId);
      if (orderErr) throw orderErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Reembolso em saldo realizado com sucesso!");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao reembolsar"),
  });

  const getProfile = (userId: string | null) => profiles?.find((p) => p.user_id === userId);
  const getDeliveryLog = (orderId: string) => deliveryLogs?.find((l) => l.order_id === orderId);

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    pending: { label: "Pendente", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
    paid: { label: "Pago", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
    delivered: { label: "Entregue", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    cancelled: { label: "Cancelado", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    refund_needed: { label: "Reembolso", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
    refunded: { label: "Reembolsado", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  };

  const filteredOrders = orders?.filter((order) => {
    const matchSearch =
      !searchTerm ||
      order.id.includes(searchTerm) ||
      (order as any).payment_id?.includes(searchTerm) ||
      (order as any).pix_client_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order as any).pix_client_doc?.includes(searchTerm) ||
      getProfile(order.user_id)?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = statusFilter === "all" || order.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const CopyButton = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copyToClipboard(text, id)}
      className="ml-1.5 text-muted-foreground hover:text-primary transition-colors"
    >
      {copiedField === id ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
    </button>
  );

  const InfoRow = ({ label, value, copyId, mono }: { label: string; value: string | null; copyId?: string; mono?: boolean }) => {
    if (!value) return null;
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-xs text-muted-foreground w-32 shrink-0">{label}:</span>
        <span className={`text-xs text-foreground ${mono ? "font-mono" : ""} break-all`}>{value}</span>
        {copyId && <CopyButton text={value} id={copyId} />}
      </div>
    );
  };

  return (
    <div>
      <h1 className="font-display text-2xl text-foreground mb-6">Pedidos</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID, email, nome, CPF/CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background border-border/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="all">Todos status</option>
          <option value="pending">Pendente</option>
          <option value="paid">Pago</option>
          <option value="delivered">Entregue</option>
          <option value="cancelled">Cancelado</option>
          <option value="refund_needed">Reembolso</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="space-y-2">
          {filteredOrders?.map((order) => {
            const profile = getProfile(order.user_id);
            const delivery = getDeliveryLog(order.id);
            const isExpanded = expandedOrder === order.id;
            const sc = statusConfig[order.status] || statusConfig.pending;
            const orderAny = order as any;

            return (
              <div
                key={order.id}
                className="rounded-xl border border-border/30 bg-card overflow-hidden transition-all"
              >
                {/* Header Row */}
                <div
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/10 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex-1 min-w-0 grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 items-center">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">{order.id.slice(0, 8)}...</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(order.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-foreground truncate">
                        {profile?.email || profile?.display_name || "—"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {orderAny.pix_client_name || "—"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-primary whitespace-nowrap">
                      R$ {Number(order.total_price).toFixed(2)}
                    </span>
                    <Badge variant="outline" className={`${sc.bg} ${sc.color} border text-[10px] whitespace-nowrap`}>
                      {sc.label}
                    </Badge>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-border/20 px-4 py-4 bg-muted/5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Order Info */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-display text-primary uppercase tracking-wider mb-2">Informações do Pedido</h4>
                        <InfoRow label="ID Pedido" value={order.id} copyId={`id-${order.id}`} mono />
                        <InfoRow label="Data/Hora" value={new Date(order.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} />
                        <InfoRow label="Método" value={order.payment_method === "balance" ? "Saldo da Plataforma" : order.payment_method ? "Pix - Efi Pay" : "N/A"} />
                        <InfoRow label="Total" value={`R$ ${Number(order.total_price).toFixed(2)}`} />
                        <InfoRow label="Produto ID" value={order.product_id} copyId={`pid-${order.id}`} mono />
                        {order.lzt_item_id && <InfoRow label="LZT Item" value={`#${order.lzt_item_id}`} copyId={`lzt-${order.id}`} mono />}
                        {order.fortnite_username && <InfoRow label="Fortnite User" value={order.fortnite_username} />}
                      </div>

                      {/* Right: PIX Info */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-display text-primary uppercase tracking-wider mb-2">Informações do Pagamento PIX</h4>
                        <InfoRow label="Protocolo/TXID" value={orderAny.payment_id} copyId={`txid-${order.id}`} mono />
                        <InfoRow label="Email" value={profile?.email || null} copyId={`email-${order.id}`} />
                        <InfoRow label="Cliente" value={orderAny.pix_client_name} />
                        <InfoRow label="Discord ID" value={profile?.discord_id || "N/A"} copyId={`disc-${order.id}`} />
                        <InfoRow label="Doc (CPF/CNPJ)" value={orderAny.pix_client_doc} copyId={`doc-${order.id}`} mono />
                        <InfoRow label="Chave Pix" value={orderAny.pix_key} copyId={`pkey-${order.id}`} mono />
                        <InfoRow label="Instituição" value={orderAny.pix_institution} />
                        <InfoRow label="Código Banco" value={orderAny.pix_bank_code} copyId={`bank-${order.id}`} mono />
                        <InfoRow label="E2EID" value={orderAny.pix_e2eid} copyId={`e2e-${order.id}`} mono />
                      </div>
                    </div>

                    {/* Credential / Delivery */}
                    {delivery && (
                      <div className="mt-4 pt-4 border-t border-border/20">
                        <h4 className="text-xs font-display text-primary uppercase tracking-wider mb-2">Credenciais Entregues</h4>
                        <div className="bg-background rounded-lg border border-border/30 p-3 relative">
                          <pre className="text-xs text-foreground whitespace-pre-wrap font-mono break-all">
                            {delivery.credential_delivered}
                          </pre>
                          <button
                            onClick={() => copyToClipboard(delivery.credential_delivered, `cred-${order.id}`)}
                            className="absolute top-2 right-2 p-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                          >
                            {copiedField === `cred-${order.id}` ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                          </button>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Entregue em: {new Date(delivery.delivered_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-4 pt-4 border-t border-border/20 flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">Alterar Status:</span>
                      <select
                        value={order.status}
                        onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value })}
                        className="rounded-lg border border-border/40 bg-background px-3 py-1.5 text-xs text-foreground"
                      >
                        <option value="pending">Pendente</option>
                        <option value="paid">Pago</option>
                        <option value="delivered">Entregue</option>
                        <option value="cancelled">Cancelado</option>
                        <option value="refund_needed">Reembolso Necessário</option>
                        <option value="refunded">Reembolsado</option>
                      </select>
                      {(order.status === "delivered" || order.status === "paid" || order.status === "refund_needed") && order.user_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (confirm(`Reembolsar R$ ${Number(order.total_price).toFixed(2)} em saldo para o cliente?`)) {
                              refundToBalance.mutate({
                                orderId: order.id,
                                userId: order.user_id!,
                                amount: Number(order.total_price),
                              });
                            }
                          }}
                          disabled={refundToBalance.isPending}
                          className="text-orange-400 border-orange-500/30 hover:bg-orange-500/10 gap-1.5"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Reembolsar em Saldo
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {(!filteredOrders || filteredOrders.length === 0) && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {searchTerm || statusFilter !== "all" ? "Nenhum pedido encontrado com esses filtros" : "Nenhum pedido ainda"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
