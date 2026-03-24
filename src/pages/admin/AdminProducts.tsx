import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface Product {
  id: string;
  amount: number;
  price: number;
  original_price: number | null;
  popular: boolean;
  active: boolean;
  sort_order: number;
}

const AdminProducts = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [showNew, setShowNew] = useState(false);
  const [newProduct, setNewProduct] = useState({ amount: 1000, price: 10, original_price: 13, popular: false });

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vbucks_products")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as Product[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (product: typeof newProduct) => {
      const { error } = await supabase.from("vbucks_products").insert({
        amount: product.amount,
        price: product.price,
        original_price: product.original_price,
        popular: product.popular,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setShowNew(false);
      toast.success("Produto criado!");
    },
    onError: () => toast.error("Erro ao criar produto"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { error } = await supabase.from("vbucks_products").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      setEditingId(null);
      toast.success("Produto atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vbucks_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Produto removido!");
    },
    onError: () => toast.error("Erro ao remover"),
  });

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditForm(product);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl text-foreground">V-Bucks</h1>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-xl bg-gradient-gold px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-foreground"
        >
          <Plus className="h-4 w-4" /> Novo Produto
        </motion.button>
      </div>

      {showNew && (
        <div className="rounded-2xl border border-primary/30 bg-card p-5 mb-6 space-y-3">
          <h3 className="font-display text-sm text-foreground">Novo Produto</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Quantidade</label>
              <input type="number" value={newProduct.amount} onChange={(e) => setNewProduct({ ...newProduct, amount: +e.target.value })} className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Preço (R$)</label>
              <input type="number" step="0.01" value={newProduct.price} onChange={(e) => setNewProduct({ ...newProduct, price: +e.target.value })} className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Preço Original (R$)</label>
              <input type="number" step="0.01" value={newProduct.original_price} onChange={(e) => setNewProduct({ ...newProduct, original_price: +e.target.value })} className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground" />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={newProduct.popular} onChange={(e) => setNewProduct({ ...newProduct, popular: e.target.checked })} />
                Popular
              </label>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate(newProduct)} className="flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground">
              <Save className="h-3 w-3" /> Salvar
            </button>
            <button onClick={() => setShowNew(false)} className="flex items-center gap-1 rounded-lg border border-border/40 px-4 py-2 text-xs text-foreground">
              <X className="h-3 w-3" /> Cancelar
            </button>
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
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Quantidade</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Preço</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Original</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Popular</th>
                <th className="px-4 py-3 text-left text-xs text-muted-foreground uppercase tracking-wider">Ativo</th>
                <th className="px-4 py-3 text-right text-xs text-muted-foreground uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((product) => (
                <tr key={product.id} className="border-b border-border/20 hover:bg-muted/10">
                  {editingId === product.id ? (
                    <>
                      <td className="px-4 py-3"><input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: +e.target.value })} className="w-24 rounded-lg border border-border/40 bg-background px-2 py-1 text-sm text-foreground" /></td>
                      <td className="px-4 py-3"><input type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: +e.target.value })} className="w-24 rounded-lg border border-border/40 bg-background px-2 py-1 text-sm text-foreground" /></td>
                      <td className="px-4 py-3"><input type="number" step="0.01" value={editForm.original_price ?? ""} onChange={(e) => setEditForm({ ...editForm, original_price: +e.target.value })} className="w-24 rounded-lg border border-border/40 bg-background px-2 py-1 text-sm text-foreground" /></td>
                      <td className="px-4 py-3"><input type="checkbox" checked={editForm.popular} onChange={(e) => setEditForm({ ...editForm, popular: e.target.checked })} /></td>
                      <td className="px-4 py-3"><input type="checkbox" checked={editForm.active} onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })} /></td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button onClick={() => updateMutation.mutate({ id: product.id, ...editForm })} className="text-primary"><Save className="h-4 w-4 inline" /></button>
                        <button onClick={() => setEditingId(null)} className="text-muted-foreground"><X className="h-4 w-4 inline" /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm text-foreground">{product.amount.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-sm text-foreground">R${Number(product.price).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{product.original_price ? `R$${Number(product.original_price).toFixed(2)}` : "—"}</td>
                      <td className="px-4 py-3 text-sm">{product.popular ? "⭐" : "—"}</td>
                      <td className="px-4 py-3 text-sm">{product.active ? <span className="text-green-500">●</span> : <span className="text-red-500">●</span>}</td>
                      <td className="px-4 py-3 text-right space-x-2">
                        <button onClick={() => startEdit(product)} className="text-muted-foreground hover:text-foreground"><Edit2 className="h-4 w-4 inline" /></button>
                        <button onClick={() => deleteMutation.mutate(product.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4 inline" /></button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {(!products || products.length === 0) && (
            <div className="text-center py-10 text-muted-foreground text-sm">Nenhum produto cadastrado</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminProducts;
