import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Trash2, Download, Search, Save, RefreshCw, Settings2, Link2, Percent, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const AdminLZT = () => {
  const queryClient = useQueryClient();
  const [newCatName, setNewCatName] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [manualId, setManualId] = useState("");
  const [manualCategory, setManualCategory] = useState("");
  const [manualMargin, setManualMargin] = useState("30");

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
        toast.warning(`${data.skipped} conta(s) ignorada(s) por categoria incompatível com a busca configurada.`);
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

  // Clear all accounts
  const clearAll = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("lzt-import", {
        body: { action: "clear_all" },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lzt-account-counts"] });
      toast.success("Todas as contas removidas!");
    },
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

  // Sync shop categories into lzt_categories
  const syncCategories = useMutation({
    mutationFn: async () => {
      if (!shopCategories?.length) throw new Error("Nenhuma categoria da loja encontrada");
      const existingNames = categories?.map((c) => c.name.toLowerCase()) || [];
      const toCreate = shopCategories.filter(
        (sc) => !existingNames.includes(sc.name.toLowerCase())
      );
      if (!toCreate.length) throw new Error("Todas as categorias já estão sincronizadas");
      for (const sc of toCreate) {
        const { error } = await supabase.from("lzt_categories").insert({
          name: sc.name,
          icon_url: sc.icon_url || null,
          sort_order: sc.sort_order || 0,
        });
        if (error) throw error;
      }
      return toCreate.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["lzt-categories"] });
      toast.success(`${count} categoria(s) sincronizada(s)!`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Count active auto-imports
  const activeImports = categories?.filter((c) => c.auto_import).length || 0;

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
        <button
          onClick={() => syncCategories.mutate()}
          disabled={syncCategories.isPending}
          className="flex items-center gap-2 rounded-xl bg-accent/20 border border-accent/30 px-4 py-2 text-xs font-bold text-accent-foreground uppercase hover:bg-accent/30 transition disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 ${syncCategories.isPending ? "animate-spin" : ""}`} /> Sincronizar com Loja
        </button>
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
        <div className="space-y-4">
          {categories?.map((cat) => (
            <CategoryCard
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
      )}
    </div>
  );
};

interface CategoryCardProps {
  category: any;
  count: number;
  onUpdateField: (field: string, value: any) => void;
  onImport: () => void;
  onSearch: () => void;
  onClear: () => void;
  isImporting: boolean;
  isSearching: boolean;
}

const CategoryCard = ({
  category,
  count,
  onUpdateField,
  onImport,
  onSearch,
  onClear,
  isImporting,
  isSearching,
}: CategoryCardProps) => {
  const [localUrl, setLocalUrl] = useState(category.api_url || "");
  const [localMargin, setLocalMargin] = useState(String(category.margin_percent));

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-display text-base text-foreground font-semibold">{category.name}</h3>
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

      {/* Toggle */}
      <div className="rounded-xl border border-border/30 p-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-foreground font-medium flex items-center gap-1">
            ⚡ Auto Delete + Auto Import
          </p>
          <p className="text-xs text-muted-foreground">
            Importa contas novas automaticamente e verifica a cada 1 min se continuam válidas no LZT. Remove vendidas/banidas.
          </p>
        </div>
        <Switch
          checked={category.auto_import}
          onCheckedChange={(val) => onUpdateField("auto_import", val)}
        />
      </div>

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
  );
};

export default AdminLZT;
