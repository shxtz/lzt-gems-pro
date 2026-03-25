import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Coins, Package, ShoppingCart, Clock } from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

/* ── Stat Card ─────────────────────────────────────────── */

const StatCard = ({ icon: Icon, label, value, borderColor, delay = 0 }: {
  icon: any; label: string; value: string; borderColor: string; delay?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="rounded-xl bg-card border border-border/30 p-5 flex items-center justify-between"
    style={{ borderLeftWidth: 3, borderLeftColor: borderColor }}
  >
    <div>
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
      <p className="font-display text-2xl text-foreground mt-1">{value}</p>
    </div>
    <div className="h-10 w-10 rounded-xl bg-muted/10 flex items-center justify-center">
      <Icon className="h-5 w-5 text-muted-foreground" />
    </div>
  </motion.div>
);

/* ── Helpers ───────────────────────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  delivered: "#22c55e",
  paid: "#22c55e",
  refunded: "#ef4444",
  pending: "#eab308",
  cancelled: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  delivered: "Entregue",
  paid: "Pago",
  refunded: "Reembolsado",
  pending: "Pendente",
  cancelled: "Cancelado",
};

function getLast7Days() {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function formatDayLabel(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

/* ── Dashboard ─────────────────────────────────────────── */

const AdminDashboard = () => {
  // Total revenue (delivered + paid)
  const { data: revenue } = useQuery({
    queryKey: ["admin-revenue"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("total_price, status")
        .in("status", ["paid", "delivered"]);
      return data?.reduce((sum, o) => sum + Number(o.total_price), 0) ?? 0;
    },
  });

  // Products available (lzt_accounts available + vbucks active)
  const { data: productsCount } = useQuery({
    queryKey: ["admin-products-available"],
    queryFn: async () => {
      const [lzt, vb] = await Promise.all([
        supabase.from("lzt_accounts").select("*", { count: "exact", head: true }).eq("status", "available"),
        supabase.from("vbucks_products").select("*", { count: "exact", head: true }).eq("active", true),
      ]);
      return (lzt.count ?? 0) + (vb.count ?? 0);
    },
  });

  // Sales completed
  const { data: salesCount } = useQuery({
    queryKey: ["admin-sales-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .in("status", ["paid", "delivered"]);
      return count ?? 0;
    },
  });

  // Pending orders
  const { data: pendingCount } = useQuery({
    queryKey: ["admin-pending-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      return count ?? 0;
    },
  });

  // Revenue last 7 days for chart
  const { data: revenueChart } = useQuery({
    queryKey: ["admin-revenue-chart"],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data } = await supabase
        .from("orders")
        .select("total_price, created_at")
        .in("status", ["paid", "delivered"])
        .gte("created_at", sevenDaysAgo.toISOString());

      const days = getLast7Days();
      const dayMap: Record<string, number> = {};
      days.forEach(d => (dayMap[d] = 0));
      data?.forEach(o => {
        const day = o.created_at.split("T")[0];
        if (dayMap[day] !== undefined) dayMap[day] += Number(o.total_price);
      });
      return days.map(d => ({ date: d, label: formatDayLabel(d), revenue: dayMap[d] }));
    },
  });

  // Order status distribution for pie chart
  const { data: statusDist } = useQuery({
    queryKey: ["admin-status-distribution"],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("status");
      const counts: Record<string, number> = {};
      data?.forEach(o => {
        counts[o.status] = (counts[o.status] || 0) + 1;
      });
      return Object.entries(counts).map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_COLORS[status] || "#6b7280",
      }));
    },
  });

  // Recent orders with user email
  const { data: recentOrders } = useQuery({
    queryKey: ["admin-recent-orders-dashboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("id, status, total_price, created_at, user_id, fortnite_username")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!data || data.length === 0) return [];

      // Get emails for users
      const userIds = [...new Set(data.map(o => o.user_id).filter(Boolean))];
      let emailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, email")
          .in("user_id", userIds);
        profiles?.forEach(p => { if (p.email) emailMap[p.user_id] = p.email; });
      }

      return data.map(o => ({
        ...o,
        email: o.user_id ? emailMap[o.user_id] || o.fortnite_username || `#${o.id.slice(0, 8)}` : o.fortnite_username || `#${o.id.slice(0, 8)}`,
      }));
    },
  });

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      delivered: "bg-green-500/15 text-green-400 border-green-500/30",
      paid: "bg-green-500/15 text-green-400 border-green-500/30",
      pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
      cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
      refunded: "bg-red-500/15 text-red-400 border-red-500/30",
    };
    return (
      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${colors[status] || "bg-muted/10 text-muted-foreground border-border/20"}`}>
        {STATUS_LABELS[status] || status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Coins} label="Receita Total" value={`R$ ${(revenue ?? 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} borderColor="#ecb32c" delay={0} />
        <StatCard icon={Package} label="Produtos Disponíveis" value={String(productsCount ?? 0)} borderColor="#3b82f6" delay={0.05} />
        <StatCard icon={ShoppingCart} label="Vendas Realizadas" value={String(salesCount ?? 0)} borderColor="#22c55e" delay={0.1} />
        <StatCard icon={Clock} label="Pedidos Pendentes" value={String(pendingCount ?? 0)} borderColor="#eab308" delay={0.15} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-5">
        {/* Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl bg-card border border-border/30 p-5"
        >
          <h2 className="font-display text-sm text-foreground mb-4">Receita — Últimos 7 dias</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChart || []}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ecb32c" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ecb32c" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#888" }} axisLine={false} tickLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita"]}
                  labelStyle={{ color: "#888" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#ecb32c" strokeWidth={2} fill="url(#revenueGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Status Pie */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl bg-card border border-border/30 p-5"
        >
          <h2 className="font-display text-sm text-foreground mb-4">Status dos Pedidos</h2>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDist || []}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(statusDist || []).map((entry, index) => (
                    <Cell key={index} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Legend
                  verticalAlign="bottom"
                  iconType="square"
                  iconSize={10}
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => <span className="text-muted-foreground ml-1">{value}</span>}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1a1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="rounded-xl bg-card border border-border/30 p-5"
      >
        <h2 className="font-display text-sm text-foreground mb-4">Pedidos Recentes</h2>
        <div className="space-y-1">
          {recentOrders && recentOrders.length > 0 ? (
            recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/5 transition-colors border-b border-border/10 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm text-foreground font-medium truncate">{order.email}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-display text-foreground">
                    R$ {Number(order.total_price).toFixed(2).replace(".", ",")}
                  </span>
                  {statusBadge(order.status)}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-muted-foreground text-sm py-8">Nenhum pedido recente</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AdminDashboard;
