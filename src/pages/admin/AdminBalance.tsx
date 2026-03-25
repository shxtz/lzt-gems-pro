import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Search, Plus, Minus, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  balance: number | null;
}

const AdminBalance = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [operation, setOperation] = useState<"add" | "remove">("add");

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["admin-balance-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, email, display_name, balance")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ["admin-balance-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("balance_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const balanceMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !amount) throw new Error("Selecione usuário e valor");
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) throw new Error("Valor inválido");

      const finalAmount = operation === "add" ? numAmount : -numAmount;
      const newBalance = (selectedUser.balance || 0) + finalAmount;
      if (newBalance < 0) throw new Error("Saldo não pode ficar negativo");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ balance: newBalance })
        .eq("user_id", selectedUser.user_id);
      if (updateError) throw updateError;

      const { error: txError } = await supabase.from("balance_transactions").insert({
        user_id: selectedUser.user_id,
        amount: finalAmount,
        type: operation === "add" ? "credit" : "debit",
        description: description || (operation === "add" ? "Crédito manual" : "Débito manual"),
        admin_id: user?.id,
      });
      if (txError) throw txError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-balance-users"] });
      queryClient.invalidateQueries({ queryKey: ["admin-balance-transactions"] });
      toast.success(`Saldo ${operation === "add" ? "adicionado" : "removido"} com sucesso!`);
      setAmount("");
      setDescription("");
      setSelectedUser(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = profiles?.filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.email?.toLowerCase().includes(q) || p.display_name?.toLowerCase().includes(q);
  });

  const getUserName = (userId: string) => {
    const p = profiles?.find((pr) => pr.user_id === userId);
    return p?.display_name || p?.email || userId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-foreground">Gerenciar Saldo</h1>

      {/* Adjust Balance Card */}
      <div className="rounded-2xl border border-primary/20 bg-card p-6 space-y-4">
        <h2 className="font-display text-sm text-foreground uppercase tracking-wider flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" /> Ajustar Saldo
        </h2>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuário por email ou nome..."
            className="pl-10"
          />
        </div>

        {search && filtered && filtered.length > 0 && !selectedUser && (
          <div className="rounded-xl border border-border/30 max-h-48 overflow-y-auto divide-y divide-border/20">
            {filtered.slice(0, 10).map((p) => (
              <button
                key={p.id}
                onClick={() => { setSelectedUser(p); setSearch(""); }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-muted/20 transition-colors text-left"
              >
                <div>
                  <p className="text-sm text-foreground">{p.display_name || p.email}</p>
                  <p className="text-[10px] text-muted-foreground">{p.email}</p>
                </div>
                <span className="text-sm font-medium text-primary">R$ {(p.balance || 0).toFixed(2)}</span>
              </button>
            ))}
          </div>
        )}

        {selectedUser && (
          <div className="space-y-3">
            <div className="rounded-xl bg-muted/10 border border-border/30 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{selectedUser.display_name || selectedUser.email}</p>
                <p className="text-[10px] text-muted-foreground">{selectedUser.email}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-primary">R$ {(selectedUser.balance || 0).toFixed(2)}</p>
                <button onClick={() => setSelectedUser(null)} className="text-[10px] text-muted-foreground hover:text-destructive">
                  Trocar usuário
                </button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant={operation === "add" ? "default" : "outline"}
                onClick={() => setOperation("add")}
                className={`gap-1.5 flex-1 ${operation === "add" ? "bg-green-600 hover:bg-green-700" : ""}`}
              >
                <Plus className="h-3.5 w-3.5" /> Adicionar
              </Button>
              <Button
                size="sm"
                variant={operation === "remove" ? "default" : "outline"}
                onClick={() => setOperation("remove")}
                className={`gap-1.5 flex-1 ${operation === "remove" ? "bg-red-600 hover:bg-red-700" : ""}`}
              >
                <Minus className="h-3.5 w-3.5" /> Remover
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Valor (R$)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Descrição</label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Motivo do ajuste..."
                />
              </div>
            </div>

            <Button
              onClick={() => balanceMutation.mutate()}
              disabled={balanceMutation.isPending || !amount}
              className="w-full bg-gradient-gold text-primary-foreground"
            >
              {balanceMutation.isPending ? "Processando..." : `${operation === "add" ? "Adicionar" : "Remover"} R$ ${amount || "0.00"}`}
            </Button>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/20">
          <h2 className="font-display text-sm text-foreground uppercase tracking-wider">Histórico Recente</h2>
        </div>
        {!recentTransactions?.length ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma transação registrada.</div>
        ) : (
          <div className="divide-y divide-border/10 max-h-[400px] overflow-y-auto">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.amount > 0 ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                  {tx.amount > 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{getUserName(tx.user_id)}</p>
                  <p className="text-[10px] text-muted-foreground">{tx.description || tx.type}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-medium ${tx.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                    {tx.amount > 0 ? "+" : ""}R$ {Math.abs(tx.amount).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(tx.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminBalance;
