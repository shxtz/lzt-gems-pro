import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, GripVertical, Eye, EyeOff, Save, X, Upload, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface ShopCategory {
  id: string;
  name: string;
  slug: string;
  emoji: string;
  icon_url: string | null;
  sort_order: number;
  visible: boolean;
}

interface SortableRowProps {
  cat: ShopCategory;
  onEdit: (cat: ShopCategory) => void;
  onDelete: (id: string) => void;
  onToggleVisibility: (cat: ShopCategory) => void;
}

const SortableRow = ({ cat, onEdit, onDelete, onToggleVisibility }: SortableRowProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: cat.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 px-5 py-3.5 bg-card hover:bg-muted/20 transition-colors ${isDragging ? "shadow-lg ring-1 ring-primary/30 rounded-lg" : ""}`}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing touch-none p-1">
        <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
      </button>
      <div className="w-10 h-10 rounded-lg border border-border/30 bg-muted/10 flex items-center justify-center overflow-hidden shrink-0">
        {cat.icon_url ? (
          <img src={cat.icon_url} alt={cat.name} className="w-8 h-8 object-contain" />
        ) : (
          <span className="text-xl">{cat.emoji || "📦"}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-foreground truncate">{cat.name}</p>
        <p className="text-[11px] text-muted-foreground">/contas/{cat.slug}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={() => onToggleVisibility(cat)} className={`p-2 rounded-lg transition-colors ${cat.visible ? "text-primary hover:bg-primary/10" : "text-muted-foreground hover:bg-muted/30"}`}>
          {cat.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
        <button onClick={() => onEdit(cat)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
          <Pencil className="h-4 w-4" />
        </button>
        <button onClick={() => { if (confirm("Remover esta categoria?")) onDelete(cat.id); }} className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const AdminCategories = () => {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", emoji: "", icon_url: "", visible: true });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !categories) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);

    // Optimistic update
    queryClient.setQueryData(["admin-shop-categories"], reordered);

    // Persist all new sort_order values
    const updates = reordered.map((cat, i) =>
      supabase.from("shop_categories").update({ sort_order: i }).eq("id", cat.id)
    );
    await Promise.all(updates);
    queryClient.invalidateQueries({ queryKey: ["admin-shop-categories"] });
    queryClient.invalidateQueries({ queryKey: ["home-shop-categories"] });
    toast.success("Ordem atualizada!");
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Apenas imagens são permitidas");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 2MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("category-icons")
        .upload(fileName, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("category-icons").getPublicUrl(fileName);
      setForm((prev) => ({ ...prev, icon_url: urlData.publicUrl }));
      toast.success("Imagem enviada!");
    } catch (err: any) {
      toast.error("Erro ao enviar imagem: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (cat: Partial<ShopCategory> & { id?: string }) => {
      if (cat.id) {
        const { error } = await supabase.from("shop_categories").update({
          name: cat.name, slug: cat.slug, emoji: cat.emoji, icon_url: cat.icon_url || null, visible: cat.visible,
        }).eq("id", cat.id);
        if (error) throw error;
      } else {
        const maxOrder = categories?.length ? Math.max(...categories.map(c => c.sort_order)) + 1 : 0;
        const { error } = await supabase.from("shop_categories").insert({
          name: cat.name, slug: cat.slug, emoji: cat.emoji || "", icon_url: cat.icon_url || null, visible: cat.visible ?? true, sort_order: maxOrder,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shop-categories"] });
      queryClient.invalidateQueries({ queryKey: ["home-shop-categories"] });
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
      queryClient.invalidateQueries({ queryKey: ["home-shop-categories"] });
      toast.success("Categoria removida!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const startEdit = (cat: ShopCategory) => {
    setEditing(cat.id);
    setAdding(false);
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

  const iconPreview = form.icon_url || null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-foreground">Categorias</h1>
          <p className="text-sm text-muted-foreground">Gerencie as categorias da loja e da home. Arraste para reordenar.</p>
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
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-center overflow-hidden shrink-0">
                  {iconPreview ? (
                    <img src={iconPreview} alt="preview" className="w-12 h-12 object-contain" />
                  ) : form.emoji ? (
                    <span className="text-3xl">{form.emoji}</span>
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleImageUpload(file); e.target.value = ""; }} />
                  <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileInputRef.current?.click()} className="gap-2 text-xs">
                    <Upload className="h-3.5 w-3.5" />
                    {uploading ? "Enviando..." : "Enviar Imagem"}
                  </Button>
                  {iconPreview && (
                    <button type="button" onClick={() => setForm((prev) => ({ ...prev, icon_url: "" }))} className="text-[10px] text-muted-foreground hover:text-destructive transition-colors text-left">
                      Remover imagem
                    </button>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Emoji (fallback)</label>
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
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">URL do Ícone (ou envie acima)</label>
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

      {/* Categories List with Drag & Drop */}
      <div className="rounded-xl border border-border/30 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">Carregando...</div>
        ) : !categories?.length ? (
          <div className="p-8 text-center text-muted-foreground">Nenhuma categoria cadastrada.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={categories.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              <div className="divide-y divide-border/20">
                {categories.map((cat) => (
                  <SortableRow
                    key={cat.id}
                    cat={cat}
                    onEdit={startEdit}
                    onDelete={(id) => deleteMutation.mutate(id)}
                    onToggleVisibility={toggleVisibility}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default AdminCategories;
