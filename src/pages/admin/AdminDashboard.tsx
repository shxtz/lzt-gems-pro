import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, DollarSign, Users, TrendingUp, Package, Clock } from "lucide-react";
import { motion } from "framer-motion";

const StatCard = ({
  icon: Icon,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="rounded-2xl border border-border/40 bg-card p-6"
  >
    <div className="flex items-center gap-4">
      <div className={`rounded-xl p-3 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-body text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="font-display text-2xl text-foreground">{value}</p>
      </div>
    </div>
  </motion.div>
);

const AdminDashboard = () => {
  const { data: ordersCount } = useQuery({
    queryKey: ["admin-orders-count"],
    queryFn: async () => {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: revenue } = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("total_price").eq("status", "paid");
      return data?.reduce((sum, o) => sum + Number(o.total_price), 0) ?? 0;
    },
  });

  const { data: productsCount } = useQuery({
    queryKey: ["admin-products-count"],
    queryFn: async () => {
      const { count } = await supabase.from("vbucks_products").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: usersCount } = useQuery({
    queryKey: ["admin-users-count"],
    queryFn: async () => {
      const { count } = await supabase.from("profiles").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: recentOrders } = useQuery({
    queryKey: ["admin-recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, total_price, created_at, fortnite_username")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
  });

  const { data: topProducts } = useQuery({
    queryKey: ["admin-top-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("product_id, vbucks_products(amount, price)")
        .eq("status", "paid");
      
      const counts: Record<string, { amount: number; price: number; count: number }> = {};
      data?.forEach((o: any) => {
        if (o.product_id && o.vbucks_products) {
          if (!counts[o.product_id]) {
            counts[o.product_id] = { amount: o.vbucks_products.amount, price: o.vbucks_products.price, count: 0 };
          }
          counts[o.product_id].count++;
        }
      });
      return Object.entries(counts)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
  });

  const paidOrders = recentOrders?.filter((o) => o.status === "paid").length ?? 0;
  const totalRecent = recentOrders?.length ?? 1;
  const conversionRate = totalRecent > 0 ? ((paidOrders / totalRecent) * 100).toFixed(0) : "--";

  const statusMap: Record<string, { label: string; color: string }> = {
    pending: { label: "Pendente", color: "text-yellow-500 bg-yellow-500/10" },
    paid: { label: "Pago", color: "text-green-500 bg-green-500/10" },
    cancelled: { label: "Cancelado", color: "text-destructive bg-destructive/10" },
    delivered: { label: "Entregue", color: "text-primary bg-primary/10" },
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-foreground">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Pedidos" value={String(ordersCount ?? 0)} color="bg-primary/10 text-primary" delay={0} />
        <StatCard icon={DollarSign} label="Receita" value={`R$${(revenue ?? 0).toFixed(2)}`} color="bg-green-500/10 text-green-500" delay={0.05} />
        <StatCard icon={Users} label="Usuários" value={String(usersCount ?? 0)} color="bg-blue-500/10 text-blue-500" delay={0.1} />
        <StatCard icon={TrendingUp} label="Conversão" value={`${conversionRate}%`} color="bg-purple-500/10 text-purple-500" delay={0.15} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-2xl border border-border/40 bg-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-lg text-foreground">Atividade Recente</h2>
          </div>
          <div className="space-y-2">
            {recentOrders && recentOrders.length > 0 ? (
              recentOrders.map((order) => {
                const s = statusMap[order.status] || statusMap.pending;
                return (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-background/50 border border-border/20"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg p-1.5 bg-muted/50">
                        <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {order.fortnite_username || `#${order.id.slice(0, 8)}`}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                        {s.label}
                      </span>
                      <span className="text-sm font-display text-foreground">
                        R${Number(order.total_price).toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground text-sm py-8">Nenhuma atividade recente</p>
            )}
          </div>
        </motion.div>

        {/* Top Products */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-border/40 bg-card p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-lg text-foreground">Mais Vendidos</h2>
          </div>
          <div className="space-y-3">
            {topProducts && topProducts.length > 0 ? (
              topProducts.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/20">
                  <span className="font-display text-lg text-primary/60 w-6 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{p.amount} V-Bucks</p>
                    <p className="text-[11px] text-muted-foreground">{p.count} vendas</p>
                  </div>
                  <span className="text-sm font-display text-primary">R${Number(p.price).toFixed(2)}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground text-sm py-8">Sem dados</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
