import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Shield, ShieldOff, RefreshCw, User, ChevronDown, ChevronUp } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  discord_id: string | null;
  balance: number | null;
  restorecord_verified: boolean | null;
  created_at: string;
  avatar_url: string | null;
}

const AdminUsers = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("*");
      if (error) throw error;
      return data as { id: string; user_id: string; role: string }[];
    },
  });

  const { data: orderCounts } = useQuery({
    queryKey: ["admin-user-order-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("user_id, status");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((o) => {
        if (o.user_id && (o.status === "paid" || o.status === "delivered")) {
          counts[o.user_id] = (counts[o.user_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const syncDiscordMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke("sync-discord-ids", {
        body: { userId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Sincronização Discord iniciada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      if (isAdmin) {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Role atualizada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const isAdmin = (userId: string) => roles?.some((r) => r.user_id === userId && r.role === "admin");

  const filtered = profiles?.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.email?.toLowerCase().includes(q) ||
      p.display_name?.toLowerCase().includes(q) ||
      p.discord_id?.includes(q) ||
      p.user_id.includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Usuários</h1>
          <p className="text-sm text-muted-foreground">
            {profiles?.length || 0} usuários cadastrados
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => syncDiscordMutation.mutate("")}
          disabled={syncDiscordMutation.isPending}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${syncDiscordMutation.isPending ? "animate-spin" : ""}`} />
          Sync Discord IDs
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email, nome, discord ID..."
          className="pl-10"
        />
      </div>

      <div className="rounded-xl border border-border/30 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : !filtered?.length ? (
          <div className="p-8 text-center text-muted-foreground">Nenhum usuário encontrado.</div>
        ) : (
          <div className="divide-y divide-border/20">
            {filtered.map((p) => (
              <div key={p.id} className="bg-card hover:bg-muted/10 transition-colors">
                <div
                  className="flex items-center gap-4 px-5 py-3.5 cursor-pointer"
                  onClick={() => setExpandedUser(expandedUser === p.id ? null : p.id)}
                >
                  <div className="w-9 h-9 rounded-full bg-muted/20 border border-border/30 flex items-center justify-center overflow-hidden shrink-0">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">
                        {p.display_name || p.email || "Sem nome"}
                      </p>
                      {isAdmin(p.user_id) && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold uppercase tracking-wider">
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{p.email}</p>
                  </div>
                  <div className="text-right shrink-0 hidden md:block">
                    <p className="text-xs text-muted-foreground">
                      {p.discord_id ? `Discord: ${p.discord_id}` : "Sem Discord"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60">
                      {orderCounts?.[p.user_id] || 0} pedidos
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-primary">
                      R$ {(p.balance || 0).toFixed(2)}
                    </p>
                  </div>
                  {expandedUser === p.id ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </div>

                {expandedUser === p.id && (
                  <div className="px-5 pb-4 pt-1 border-t border-border/10 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground block">User ID</span>
                        <span className="text-foreground font-mono text-[10px] break-all">{p.user_id}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Discord ID</span>
                        <span className="text-foreground">{p.discord_id || "—"}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">RestoreCord</span>
                        <span className={p.restorecord_verified ? "text-green-500" : "text-yellow-500"}>
                          {p.restorecord_verified ? "Verificado" : "Não verificado"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Cadastro</span>
                        <span className="text-foreground">
                          {new Date(p.created_at).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleAdminMutation.mutate({ userId: p.user_id, isAdmin: !!isAdmin(p.user_id) });
                        }}
                      >
                        {isAdmin(p.user_id) ? <ShieldOff className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                        {isAdmin(p.user_id) ? "Remover Admin" : "Tornar Admin"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          syncDiscordMutation.mutate(p.user_id);
                        }}
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Sync Discord
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;
