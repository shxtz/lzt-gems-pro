import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, DollarSign, Users, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
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
  const { data: orders } = useQuery({
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

  const { data: products } = useQuery({
    queryKey: ["admin-products-count"],
    queryFn: async () => {
      const { count } = await supabase.from("vbucks_products").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  return (
    <div>
      <h1 className="font-display text-2xl text-foreground mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ShoppingCart} label="Pedidos" value={String(orders ?? 0)} color="bg-primary/10 text-primary" />
        <StatCard icon={DollarSign} label="Receita" value={`R$${(revenue ?? 0).toFixed(2)}`} color="bg-green-500/10 text-green-500" />
        <StatCard icon={Users} label="Produtos" value={String(products ?? 0)} color="bg-blue-500/10 text-blue-500" />
        <StatCard icon={TrendingUp} label="Conversão" value="--" color="bg-purple-500/10 text-purple-500" />
      </div>
    </div>
  );
};

export default AdminDashboard;
