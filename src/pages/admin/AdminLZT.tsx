import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Trash2, Download, Search, RefreshCw, Settings2, Link2, Percent, AlertTriangle,
  Activity, CheckCircle2, XCircle, Clock, Loader2, ArrowDownCircle, Zap, GripVertical,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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

import valorantImg from "@/assets/categories/valorant.png";
import fortniteImg from "@/assets/categories/fortnite.png";
import genshinImg from "@/assets/categories/genshin.png";
import lolImg from "@/assets/categories/lol.png";
import honkaiImg from "@/assets/categories/honkai.png";
import minecraftImg from "@/assets/categories/minecraft.png";
import steamImg from "@/assets/categories/steam.png";
import zzzImg from "@/assets/categories/zzz.png";

const CATEGORY_IMAGES: Record<string, string> = {
  valorant: valorantImg,
  fortnite: fortniteImg,
  genshin: genshinImg,
  lol: lolImg,
  honkai: honkaiImg,
  minecraft: minecraftImg,
  steam: steamImg,
  zzz: zzzImg,
};

function getCategoryImage(name: string): string | null {
  const lower = name.toLowerCase();
  for (const [key, img] of Object.entries(CATEGORY_IMAGES)) {
    if (lower.includes(key)) return img;
  }
  // Extra aliases
  if (lower.includes("league")) return CATEGORY_IMAGES.lol;
  if (lower.includes("zenless")) return CATEGORY_IMAGES.zzz;
  return null;
}

/* ── Activity log types ────────────────────────────────── */

interface ActivityEntry {
  id: string;
  timestamp: Date;
  type: "info" | "success" | "warning" | "error" | "importing" | "checking";
  message: string;
}

const logIcon = (type: ActivityEntry["type"]) => {
  switch (type) {
    case "success": return <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />;
    case "warning": return <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />;
    case "error": return <XCircle className="h-3 w-3 text-red-400 shrink-0" />;
    case "importing": return <ArrowDownCircle className="h-3 w-3 text-blue-400 shrink-0 animate-bounce" />;
    case "checking": return <RefreshCw className="h-3 w-3 text-purple-400 shrink-0 animate-spin" />;
    default: return <Activity className="h-3 w-3 text-muted-foreground shrink-0" />;
  }
};

const AdminLZT = () => {
  const queryClient = useQueryClient();
  const [newCatName, setNewCatName] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [manualId, setManualId] = useState("");
  const [manualCategory, setManualCategory] = useState("");
  const [manualMargin, setManualMargin] = useState("30");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Fetch categories with account counts
  const { data: categories, isLoading } = useQuery({
    queryKey: ["lzt-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lzt_categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch account counts per category
  const { data: accountCounts } = useQuery({
    queryKey: ["lzt-account-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lzt_accounts")
        .select("category_id, status");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data?.forEach((a) => {
        if (a.status === "available") {
          counts[a.category_id] = (counts[a.category_id] || 0) + 1;
        }
      });
      return counts;
    },
    refetchInterval: 15000, // Refresh counts every 15s for live feel
  });

  const totalAccounts = Object.values(accountCounts || {}).reduce((s, c) => s + c, 0);

  // Add category
  const addCategory = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from("lzt_categories").insert({ name });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lzt-categories"] });
      setNewCatName("");
      setShowAddDialog(false);
      toast.success("Categoria adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar categoria"),
  });

  // Update category field
  const updateCategory = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: any }) => {
      const { error } = await supabase.from("lzt_categories").update({ [field]: value }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lzt-categories"] }),
    onError: () => toast.error("Erro ao atualizar"),
  });

  // Import accounts
  const importAccounts = useMutation({
    mutationFn: async ({ categoryId, apiUrl, margin }: { categoryId: string; apiUrl: string; margin: number }) => {
      const { data, error } = await supabase.functions.invoke("lzt-import", {
        body: { action: "import", category_id: categoryId, api_url: apiUrl, margin_percent: margin },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["lzt-account-counts"] });
      queryClient.invalidateQueries({ queryKey: ["lzt-categories"] });
      toast.success(`${data?.imported || 0} contas importadas!`);
      if (data?.skipped) {
        toast.warning(`${data.skipped} conta(s) ignorada(s) por categoria incompatível.`);
      }
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Search/preview
  const searchAccounts = useMutation({
    mutationFn: async (apiUrl: string) => {
      const { data, error } = await supabase.functions.invoke("lzt-import", {
        body: { action: "search", api_url: apiUrl },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      const count = data?.items?.length || 0;
      toast.info(`${count} contas encontradas na busca`);
    },
    onError: (e) => toast.error(`Erro na busca: ${e.message}`),
  });

  // Clear accounts for category
  const clearAccounts = useMutation({
    mutationFn: async (categoryId: string) => {
      const { data, error } = await supabase.functions.invoke("lzt-import", {
        body: { action: "clear", category_id: categoryId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lzt-account-counts"] });
      toast.success("Contas removidas!");
    },
  });

  // Clear all accounts + disable ALL auto imports globally
  const clearAll = useMutation({
    mutationFn: async () => {
      // 1) Disable auto_import AND auto_delete_reimport on ALL categories
      const { error: e1 } = await supabase
        .from("lzt_categories")
        .update({ auto_import: false, auto_delete_reimport: false })
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (e1) throw e1;
      // 2) Delete ALL lzt_accounts regardless of status
      const { error: e2 } = await supabase
        .from("lzt_accounts")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");
      if (e2) throw e2;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lzt-categories"] });
      queryClient.invalidateQueries({ queryKey: ["lzt-account-counts"] });
      queryClient.invalidateQueries({ queryKey: ["shop-lzt-accounts"] });
      toast.success("Todas as importações pausadas e contas removidas!");
    },
    onError: (e) => toast.error(`Erro: ${e.message}`),
  });

  // Import single by ID
  const importSingle = useMutation({
    mutationFn: async () => {
      if (!manualId || !manualCategory) throw new Error("Preencha todos os campos");
      const { data, error } = await supabase.functions.invoke("lzt-import", {
        body: {
          action: "import_single",
          lzt_item_id: manualId,
          category_id: manualCategory,
          margin_percent: parseInt(manualMargin) || 30,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lzt-account-counts"] });
      setManualId("");
      toast.success("Conta importada!");
    },
    onError: (e) => toast.error(e.message),
  });

  // Fetch shop categories to sync
  const { data: shopCategories } = useQuery({
    queryKey: ["shop-categories-for-lzt"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shop_categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Auto-sync shop categories into lzt_categories (create missing + update name/icon)
  useEffect(() => {
    if (!shopCategories?.length || !categories) return;
    (async () => {
      let changed = 0;
      for (const sc of shopCategories) {
        const existing = categories.find((c) => c.name.toLowerCase() === sc.name.toLowerCase());
        if (!existing) {
          // Create missing
          await supabase.from("lzt_categories").insert({
            name: sc.name,
            icon_url: sc.icon_url || null,
            sort_order: sc.sort_order || 0,
          });
          changed++;
        } else if (existing.icon_url !== sc.icon_url) {
          // Sync icon if changed
          await supabase.from("lzt_categories").update({ icon_url: sc.icon_url }).eq("id", existing.id);
          changed++;
        }
      }
      if (changed > 0) {
        queryClient.invalidateQueries({ queryKey: ["lzt-categories"] });
        toast.success(`${changed} categoria(s) sincronizada(s) automaticamente!`);
      }
    })();
  }, [shopCategories, categories]);

  // Count active auto-imports
  const activeImports = categories?.filter((c) => c.auto_import).length || 0;

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !categories) return;

    const oldIndex = categories.findIndex((c) => c.id === active.id);
    const newIndex = categories.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(categories, oldIndex, newIndex);

    queryClient.setQueryData(["lzt-categories"], reordered);

    // Update lzt_categories sort_order
    const lztUpdates = reordered.map((cat, i) =>
      supabase.from("lzt_categories").update({ sort_order: i }).eq("id", cat.id)
    );
    // Also sync shop_categories sort_order to match
    const shopUpdates = reordered.map((cat, i) => {
      const matchingShop = shopCategories?.find((sc) => sc.name.toLowerCase() === cat.name.toLowerCase());
      if (matchingShop) {
        return supabase.from("shop_categories").update({ sort_order: i }).eq("id", matchingShop.id);
      }
      return null;
    }).filter(Boolean);

    await Promise.all([...lztUpdates, ...shopUpdates]);
    queryClient.invalidateQueries({ queryKey: ["lzt-categories"] });
    queryClient.invalidateQueries({ queryKey: ["admin-shop-categories"] });
    queryClient.invalidateQueries({ queryKey: ["home-shop-categories"] });
    toast.success("Ordem atualizada!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-primary" />
          <h1 className="font-display text-2xl text-foreground">Integração LZT Market</h1>
        </div>
        <button
          onClick={() => clearAll.mutate()}
          className="flex items-center gap-2 rounded-xl border border-destructive/50 px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition"
        >
          <Trash2 className="h-3 w-3" /> Apagar todas contas LZT
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="h-2 w-2 rounded-full bg-green-500" />
          Total LZT: <span className="text-foreground font-bold">{totalAccounts}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          Limite por categoria: <span className="text-foreground font-bold">300</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-green-500 text-xs font-medium">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          {activeImports} import(s) ativo(s)
        </div>
      </div>

      {/* Manual import by ID */}
      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-display text-sm text-foreground">Importar conta manualmente por ID</h2>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">ID do LZT</span>
            <input
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
              placeholder="Ex: 12345678"
              className="rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground w-36 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Categoria</span>
            <select
              value={manualCategory}
              onChange={(e) => setManualCategory(e.target.value)}
              className="rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            >
              <option value="">Selecione...</option>
              {categories?.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Margem %</span>
            <input
              value={manualMargin}
              onChange={(e) => setManualMargin(e.target.value)}
              className="rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground w-16 focus:outline-none focus:ring-1 focus:ring-primary/50"
              type="number"
            />
          </div>
          <button
            onClick={() => importSingle.mutate()}
            disabled={importSingle.isPending}
            className="flex items-center gap-2 rounded-xl bg-primary/20 border border-primary/30 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/30 transition"
          >
            <Download className="h-3 w-3" /> Importar
          </button>
        </div>
      </div>

      {/* Info text */}
      <p className="text-xs text-muted-foreground">
        Configure as URLs de busca, margem de lucro, e ative Auto Import e/ou Auto Delete por categoria.
      </p>

      {/* Add category buttons */}
      <div className="flex gap-3 flex-wrap">
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-primary-foreground uppercase">
              <Plus className="h-3 w-3" /> Nova Categoria
            </button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Categoria LZT</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Nome da categoria (ex: Valorant BR)"
                className="w-full rounded-xl border border-border/40 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button
                onClick={() => addCategory.mutate(newCatName)}
                disabled={!newCatName || addCategory.isPending}
                className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground uppercase"
              >
                Criar Categoria
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Categories list */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Carregando...</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={categories?.map((c) => c.id) || []} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {categories?.map((cat) => (
                <SortableCategoryCard
                  key={cat.id}
                  category={cat}
                  count={accountCounts?.[cat.id] || 0}
                  onUpdateField={(field, value) =>
                    updateCategory.mutate({ id: cat.id, field, value })
                  }
                  onImport={() =>
                    importAccounts.mutate({
                      categoryId: cat.id,
                      apiUrl: cat.api_url,
                      margin: cat.margin_percent,
                    })
                  }
                  onSearch={() => searchAccounts.mutate(cat.api_url)}
                  onClear={() => clearAccounts.mutate(cat.id)}
                  isImporting={importAccounts.isPending}
                  isSearching={searchAccounts.isPending}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

/* ── SortableCategoryCard wrapper ───────────────────────── */

interface CategoryCardProps {
  category: any;
  count: number;
  onUpdateField: (field: string, value: any) => void;
  onImport: () => void;
  onSearch: () => void;
  onClear: () => void;
  isImporting: boolean;
  isSearching: boolean;
  dragHandleProps?: Record<string, any>;
}

const SortableCategoryCard = (props: CategoryCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CategoryCard {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
};

/* ── CategoryCard with live activity log ───────────────── */

const CategoryCard = ({
  category,
  count,
  onUpdateField,
  onImport,
  onSearch,
  onClear,
  isImporting,
  isSearching,
  dragHandleProps,
}: CategoryCardProps) => {
  const queryClient = useQueryClient();
  const [localUrl, setLocalUrl] = useState(category.api_url || "");
  const [localMargin, setLocalMargin] = useState(String(category.margin_percent));
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [pollCycle, setPollCycle] = useState(0);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef(false);

  const addLog = useCallback((type: ActivityEntry["type"], message: string) => {
    setActivityLog((prev) => {
      const entry: ActivityEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date(),
        type,
        message,
      };
      return [entry, ...prev].slice(0, 50); // keep last 50
    });
  }, []);

  // Auto-poll when auto_import is enabled
  const runPollCycle = useCallback(async () => {
    if (abortRef.current || !category.api_url) return;

    // Re-check DB to confirm auto_import is still on
    const { data: freshCat } = await supabase
      .from("lzt_categories")
      .select("auto_import")
      .eq("id", category.id)
      .maybeSingle();
    if (!freshCat?.auto_import || abortRef.current) {
      addLog("info", "Auto Import desativado — polling parado");
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    addLog("importing", "Buscando novas contas no LZT Market...");

    try {
      const { data, error } = await supabase.functions.invoke("lzt-realtime-poll", {});

      if (error) {
        addLog("error", `Erro na importação: ${error.message}`);
      } else if (data) {
        const { imported = 0, updated = 0, removed = 0 } = data;
        
        if (imported > 0) {
          addLog("success", `✅ ${imported} conta(s) importada(s) com sucesso`);
        }
        if (updated > 0) {
          addLog("info", `🔄 ${updated} preço(s) atualizado(s)`);
        }
        if (removed > 0) {
          addLog("warning", `🗑️ ${removed} conta(s) removida(s) (vendidas/banidas)`);
        }
        if (imported === 0 && updated === 0 && removed === 0) {
          addLog("info", "Nenhuma alteração detectada — estoque atualizado");
        }

        // Refresh counts
        queryClient.invalidateQueries({ queryKey: ["lzt-account-counts"] });
        queryClient.invalidateQueries({ queryKey: ["lzt-categories"] });
      }
    } catch (err: any) {
      addLog("error", `Erro: ${err.message || "Falha na conexão"}`);
    } finally {
      setIsPolling(false);
      if (!abortRef.current) setPollCycle((c) => c + 1);
    }
  }, [category.id, category.api_url, addLog, queryClient]);

  useEffect(() => {
    if (!category.auto_import) {
      abortRef.current = true;
      if (pollRef.current) clearTimeout(pollRef.current);
      return;
    }

    abortRef.current = false;

    // Add initial log when enabled
    if (activityLog.length === 0) {
      addLog("info", "⚡ Auto Import ativado — monitoramento iniciado");
      addLog("info", `URL: ${category.api_url ? category.api_url.slice(0, 60) + "..." : "Não configurada"}`);
      addLog("info", `Margem: ${category.margin_percent}% | Limite: ${category.account_limit} contas`);
    }

    // Run first cycle after a short delay
    const initialDelay = setTimeout(() => {
      runPollCycle();
    }, 2000);

    return () => clearTimeout(initialDelay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category.auto_import]);

  // Schedule next poll after each cycle completes
  useEffect(() => {
    if (!category.auto_import || pollCycle === 0 || abortRef.current) return;

    const nextPoll = setTimeout(() => {
      if (!abortRef.current) runPollCycle();
    }, 60000); // Every 60 seconds

    pollRef.current = nextPoll;
    return () => clearTimeout(nextPoll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollCycle, category.auto_import]);

  const fillPercent = Math.min(100, Math.round((count / category.account_limit) * 100));

  return (
    <div className="rounded-2xl border border-border/40 bg-card overflow-hidden">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button {...dragHandleProps} className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1">
              <GripVertical className="h-4 w-4 text-muted-foreground/40" />
            </button>
            {category.icon_url?.startsWith("http") ? (
              <img src={category.icon_url} alt="" className="h-6 w-6 rounded object-contain" />
            ) : getCategoryImage(category.name) ? (
              <img src={getCategoryImage(category.name)!} alt="" className="h-6 w-6 rounded object-contain" />
            ) : (
              <span className="text-lg">📦</span>
            )}
            <h3 className="font-display text-base text-foreground font-semibold">{category.name}</h3>
            {category.auto_import && (
              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] uppercase tracking-wider gap-1">
                <Zap className="h-2.5 w-2.5" /> Ativo
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1">
              <div className={`h-2 w-2 rounded-full ${count > 0 ? "bg-primary" : "bg-destructive"}`} />
              <span className="text-foreground font-bold">{count}/{category.account_limit}</span>
            </span>
            {category.last_import_at && (
              <span className="text-muted-foreground">
                {new Date(category.last_import_at).toLocaleString("pt-BR", {
                  day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Estoque: {count} de {category.account_limit}</span>
            <span>{fillPercent}%</span>
          </div>
          <Progress value={fillPercent} className="h-1.5" />
        </div>

        {/* Toggle */}
        <div className={`rounded-xl border p-4 flex items-center justify-between transition-colors ${
          category.auto_import ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/30"
        }`}>
          <div>
            <p className="text-sm text-foreground font-medium flex items-center gap-1.5">
              <Zap className={`h-3.5 w-3.5 ${category.auto_import ? "text-emerald-400" : "text-muted-foreground"}`} />
              Auto Delete + Auto Import
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Importa contas novas automaticamente e verifica a cada 1 min se continuam válidas no LZT. Remove vendidas/banidas.
            </p>
          </div>
          <Switch
            checked={category.auto_import}
            onCheckedChange={(val) => {
              onUpdateField("auto_import", val);
              if (val) {
                setActivityLog([]);
              }
            }}
          />
        </div>

        {/* Activity Log — shown when auto_import is enabled */}
        {category.auto_import && (
          <div className="rounded-xl border border-border/30 bg-background/50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/20">
              <div className="flex items-center gap-2">
                <Activity className="h-3.5 w-3.5 text-primary" />
                <span className="text-[11px] font-display text-foreground uppercase tracking-wider">Atividade em Tempo Real</span>
              </div>
              <div className="flex items-center gap-2">
                {isPolling && (
                  <div className="flex items-center gap-1.5 text-[10px] text-blue-400">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Processando...
                  </div>
                )}
                {!isPolling && pollCycle > 0 && (
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Próximo ciclo em ~60s
                  </div>
                )}
              </div>
            </div>
            <div
              ref={logContainerRef}
              className="max-h-48 overflow-y-auto p-3 space-y-1.5 scrollbar-thin"
            >
              {activityLog.length === 0 ? (
                <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Iniciando monitoramento...
                </div>
              ) : (
                activityLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-2 text-[11px] leading-relaxed animate-in fade-in slide-in-from-top-1 duration-300"
                  >
                    <span className="mt-0.5">{logIcon(entry.type)}</span>
                    <span className="text-muted-foreground shrink-0 font-mono">
                      {entry.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span className={`${
                      entry.type === "success" ? "text-emerald-400" :
                      entry.type === "warning" ? "text-amber-400" :
                      entry.type === "error" ? "text-red-400" :
                      "text-foreground"
                    }`}>
                      {entry.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* URL + Margin */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={localUrl}
              onChange={(e) => setLocalUrl(e.target.value)}
              placeholder="https://prod-api.lzt.market/riot?pmax=250&..."
              className="flex-1 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-xs text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={() => onUpdateField("api_url", localUrl)}
              className="rounded-xl border border-border/40 px-4 py-3 text-xs font-medium text-foreground hover:bg-muted/50 transition"
            >
              Salvar
            </button>
          </div>
          <div className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              value={localMargin}
              onChange={(e) => setLocalMargin(e.target.value)}
              type="number"
              className="w-20 rounded-xl border border-border/40 bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <span className="text-xs text-muted-foreground">% lucro</span>
            {localMargin !== String(category.margin_percent) && (
              <button
                onClick={() => onUpdateField("margin_percent", parseInt(localMargin))}
                className="text-xs text-primary underline"
              >
                Salvar
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end flex-wrap">
          <button
            onClick={onSearch}
            disabled={isSearching || !localUrl}
            className="flex items-center gap-2 rounded-xl border border-border/40 px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/50 transition disabled:opacity-50"
          >
            <Search className="h-3 w-3" /> Buscar
          </button>
          <button
            onClick={onImport}
            disabled={isImporting || !localUrl}
            className="flex items-center gap-2 rounded-xl bg-primary/20 border border-primary/30 px-4 py-2 text-xs font-medium text-primary hover:bg-primary/30 transition disabled:opacity-50"
          >
            <Download className="h-3 w-3" /> Importar
          </button>
          <button
            onClick={onClear}
            className="flex items-center gap-2 rounded-xl border border-destructive/40 px-4 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition"
          >
            <Trash2 className="h-3 w-3" /> Limpar ({count})
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminLZT;
