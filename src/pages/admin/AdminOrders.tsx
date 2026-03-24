import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminOrders = () => {
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, vbucks_products(amount)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      toast.success("Status atualizado!");
    },
  });

  const statusColors: Record<string, string> = {
    pending: "text-yellow-500 bg-yellow-500/10",
    paid: "text-green-500 bg-green-500/10",
    delivered: "text-blue-500 bg-blue-500/10",
    cancelled: "text-red-500 bg-red-500/10",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };

  return (
    <div>
      <h1 className="font-display text-2xl text-foreground mb-6">Pedidos</h1>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="rounded-2xl border border-border/40 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Produto</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Usuário Fortnite</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Data</th>
                <th className="px-4 py-3 text-right text-xs text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => (
                <tr key={order.id} className="border-b border-border/20 hover:bg-muted/10">
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{order.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {(order.vbucks_products as any)?.amount?.toLocaleString("pt-BR")} V-Bucks
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{order.fortnite_username || "—"}</td>
                  <td className="px-4 py-3 text-sm text-foreground">R${Number(order.total_price).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${statusColors[order.status] ?? ""}`}>
                      {statusLabels[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("pt-BR")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value })}
                      className="rounded-lg border border-border/40 bg-background px-2 py-1 text-xs text-foreground"
                    >
                      <option value="pending">Pendente</option>
                      <option value="paid">Pago</option>
                      <option value="delivered">Entregue</option>
                      <option value="cancelled">Cancelado</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!orders || orders.length === 0) && (
            <div className="text-center py-10 text-muted-foreground text-sm">Nenhum pedido ainda</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminOrders;
