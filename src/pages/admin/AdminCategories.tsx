import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Save, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  icon_url: string | null;
  sort_order: number;
  visible: boolean;
}

const AdminCategories = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", emoji: "", icon_url: "", visible: true });

  const { data: categories, isLoading } = useQuery({
    queryKey: ["admin-shop-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as ShopCategory[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (cat: Partial<ShopCategory> & { id?: string }) => {
      if (cat.id) {
        const { error } = await supabase.from("shop_categories").update({
          name: cat.name,
          slug: cat.slug,
          emoji: cat.emoji,
          icon_url: cat.icon_url || null,
          visible: cat.visible,
        }).eq("id", cat.id);
        if (error) throw error;
      } else {
        const maxOrder = categories?.length ? Math.max(...categories.map(c => c.sort_order)) + 1 : 0;
        const { error } = await supabase.from("shop_categories").insert({
          name: cat.name,
          slug: cat.slug,
          emoji: cat.emoji || "",
          icon_url: cat.icon_url || null,
          visible: cat.visible ?? true,
          sort_order: maxOrder,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shop-categories"] });
      setEditing(null);
      setAdding(false);
      setForm({ name: "", slug: "", emoji: "", icon_url: "", visible: true });
      toast.success("Categoria salva!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shop_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shop-categories"] });
      toast.success("Categoria removida!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (cat: ShopCategory) => {
    setEditing(cat.id);
    setForm({ name: cat.name, slug: cat.slug, emoji: cat.emoji || "", icon_url: cat.icon_url || "", visible: cat.visible });
  };

  const handleSave = () => {
    if (!form.name || !form.slug) { toast.error("Nome e slug são obrigatórios"); return; }
    saveMutation.mutate(editing ? { id: editing, ...form } : form);
  };

  const toggleVisibility = async (cat: ShopCategory) => {
    await supabase.from("shop_categories").update({ visible: !cat.visible }).eq("id", cat.id);
    queryClient.invalidateQueries({ queryKey: ["admin-shop-categories"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Categorias</h1>
          <p className="text-sm text-muted-foreground">Gerencie as categorias da loja e da home.</p>
        </div>
        <Button onClick={() => { setAdding(true); setEditing(null); setForm({ name: "", slug: "", emoji: "", icon_url: "", visible: true }); }} className="bg-gradient-gold text-primary-foreground gap-2">
          <Plus className="h-4 w-4" /> Nova Categoria
        </Button>
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {(adding || editing) && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-primary/30 bg-card p-5 space-y-4">
              <h3 className="font-display text-sm text-foreground">{editing ? "Editar Categoria" : "Nova Categoria"}</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Emoji</label>
                  <Input value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} placeholder="🎯" maxLength={4} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Nome</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Valorant BR" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Slug (URL)</label>
                  <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })} placeholder="valorant" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">URL do Ícone (opcional)</label>
                  <Input value={form.icon_url} onChange={(e) => setForm({ ...form, icon_url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saveMutation.isPending} className="bg-gradient-gold text-primary-foreground gap-2">
                  <Save className="h-4 w-4" /> Salvar
                </Button>
                <Button variant="outline" onClick={() => { setAdding(false); setEditing(null); }}>
                  <X className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Categories List */}
      <div className="rounded-xl border border-border/30 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : !categories?.length ? (
          <div className="p-8 text-center text-muted-foreground">Nenhuma categoria cadastrada.</div>
        ) : (
          <div className="divide-y divide-border/20">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-4 px-5 py-3.5 bg-card hover:bg-muted/20 transition-colors">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <span className="text-xl shrink-0 w-8 text-center">{cat.emoji || "📦"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{cat.name}</p>
                  <p className="text-[11px] text-muted-foreground">/contas/{cat.slug}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => toggleVisibility(cat)} className={`p-2 rounded-lg transition-colors ${cat.visible ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted/30"}`}>
                    {cat.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button onClick={() => startEdit(cat)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => { if (confirm("Remover esta categoria?")) deleteMutation.mutate(cat.id); }} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCategories;
