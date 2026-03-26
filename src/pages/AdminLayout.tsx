import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Package, Grid3X3, ShoppingCart, Store, MessageCircle,
  Ticket, Wallet, Users, MessageSquare, Eye, LogOut, Settings, Megaphone
} from "lucide-react";
import logo from "@/assets/logo.png";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const navItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard, end: true },
  { title: "Produtos", url: "/admin/produtos", icon: Store },
  { title: "Categorias", url: "/admin/categories", icon: Grid3X3 },
  { title: "Pedidos", url: "/admin/orders", icon: ShoppingCart },
  { title: "Sorteios", url: "/admin/products", icon: Package },
  
  { title: "LZT Market", url: "/admin/lzt", icon: Store },
  { title: "Chat", url: "/admin/tickets", icon: MessageCircle, badge: true },
  { title: "Cupons", url: "/admin/coupons", icon: Ticket },
  
  { title: "Usuários", url: "/admin/users", icon: Users },
  { title: "Discord API", url: "/admin/discord", icon: MessageSquare },
  { title: "Marketing", url: "/admin/campaigns", icon: Megaphone },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const { data: pendingTickets } = useQuery({
    queryKey: ["admin-pending-tickets-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      return count ?? 0;
    },
    refetchInterval: 30000,
  });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border/30">
        {/* Row 1: Logo + actions */}
        <div className="flex items-center justify-between px-5 h-12">
          <div className="flex items-center gap-2.5">
            <img src={logo} alt="Logo" className="h-6 w-6" />
            <span className="font-display text-sm text-foreground font-bold tracking-wide">Admin</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/loja")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Eye className="h-3.5 w-3.5" /> Ver loja
            </button>
            <button
              onClick={async () => { await signOut(); navigate("/"); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </button>
          </div>
        </div>

        {/* Row 2: Horizontal nav */}
        <ScrollArea className="w-full">
          <nav className="flex items-center gap-1 px-5 pb-2">
            {navItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.end}
                className={({ isActive }) =>
                  `relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                  }`
                }
              >
                <item.icon className="h-3.5 w-3.5" />
                <span>{item.title}</span>
                {item.badge && pendingTickets && pendingTickets > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                    {pendingTickets}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </header>

      {/* Content */}
      <main className="flex-1 p-5 lg:p-8 max-w-[1400px] w-full mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
