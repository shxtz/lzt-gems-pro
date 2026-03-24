import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

const AdminCoupons = () => {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: "", discount_percent: 10, max_uses: 100 });

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (coupon: typeof newCoupon) => {
      const { error } = await supabase.from("coupons").insert(coupon);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setShowNew(false);
      setNewCoupon({ code: "", discount_percent: 10, max_uses: 100 });
      toast.success("Cupom criado!");
    },
    onError: () => toast.error("Erro ao criar cupom"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("coupons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      toast.success("Cupom removido!");
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-foreground">Cupons</h1>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground">
          <Plus className="h-4 w-4" /> Novo Cupom
        </button>
      </div>

      {showNew && (
        <div className="rounded-2xl border border-primary/30 bg-card p-5 mb-6 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Código</label>
              <input value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground" placeholder="DESCONTO10" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Desconto (%)</label>
              <input type="number" value={newCoupon.discount_percent} onChange={(e) => setNewCoupon({ ...newCoupon, discount_percent: +e.target.value })} className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Usos Máximos</label>
              <input type="number" value={newCoupon.max_uses} onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: +e.target.value })} className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate(newCoupon)} className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"><Save className="h-3 w-3" /> Salvar</button>
            <button onClick={() => setShowNew(false)} className="flex items-center gap-1 rounded-lg border border-border/40 px-4 py-2 text-xs text-foreground"><X className="h-3 w-3" /> Cancelar</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="rounded-2xl border border-border/40 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30 bg-muted/20">
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Código</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Desconto</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Usos</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {coupons?.map((coupon) => (
                <tr key={coupon.id} className="border-b border-border/20 hover:bg-muted/10">
                  <td className="px-4 py-3 text-sm text-foreground font-mono">{coupon.code}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{coupon.discount_percent}%</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{coupon.current_uses}/{coupon.max_uses ?? "∞"}</td>
                  <td className="px-4 py-3 text-sm">{coupon.active ? <span className="text-green-500">Ativo</span> : <span className="text-red-500">Inativo</span>}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => deleteMutation.mutate(coupon.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4 inline" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!coupons || coupons.length === 0) && (
            <div className="text-center py-10 text-muted-foreground text-sm">Nenhum cupom cadastrado</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCoupons;
