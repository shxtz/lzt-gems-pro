import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AdminOrders = () => {
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

  const statusColors: Record<string, string> = {
    pending: "text-yellow-500",
    paid: "text-green-500",
    delivered: "text-blue-500",
    cancelled: "text-red-500",
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
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((order) => (
                <tr key={order.id} className="border-b border-border/20 hover:bg-muted/10">
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{order.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {(order.vbucks_products as any)?.amount?.toLocaleString("pt-BR")} V-Bucks
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">R${Number(order.total_price).toFixed(2)}</td>
                  <td className={`px-4 py-3 text-sm font-medium ${statusColors[order.status] ?? ""}`}>
                    {statusLabels[order.status] ?? order.status}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("pt-BR")}
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
