import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Plus, Trash2, Edit2, Package, Eye, EyeOff, ChevronDown, ChevronUp, Key, Mail, Upload, Search, Copy, Check, AlertTriangle, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  image_url: string | null;
  active: boolean;
  sort_order: number | null;
  created_at: string;
}

interface Variation {
  id: string;
  product_id: string;
  name: string;
  price: number;
  original_price: number | null;
  credential_type: string;
  active: boolean;
  sort_order: number | null;
}

interface StockItem {
  id: string;
  variation_id: string;
  credential: string;
  status: string;
  added_at: string;
  sold_at: string | null;
  buyer_id: string | null;
}

// Validation helpers
const validateAccountCredential = (line: string): { valid: boolean; error?: string } => {
  const parts = line.split(":");
  if (parts.length < 2) return { valid: false, error: "Formato inválido. Use email:senha" };
  const email = parts[0];
  if (!email.includes("@") || !email.includes(".")) return { valid: false, error: `Email inválido: ${email}` };
  if (parts.slice(1).join(":").length < 1) return { valid: false, error: "Senha não pode ser vazia" };
  return { valid: true };
};

const validateKeyCredential = (line: string): { valid: boolean; error?: string } => {
  if (line.length < 3) return { valid: false, error: `Key muito curta: ${line}` };
  if (/\s/.test(line) && !line.includes("-")) return { valid: false, error: `Key contém espaços: ${line}` };
  return { valid: true };
};

const AdminProductsNew = () => {
  const queryClient = useQueryClient();
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [expandedVariation, setExpandedVariation] = useState<string | null>(null);
  const [showNewProduct, setShowNewProduct] = useState(false);
  const [showNewVariation, setShowNewVariation] = useState<string | null>(null);
  const [showAddStock, setShowAddStock] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showDeliveryLog, setShowDeliveryLog] = useState<string | null>(null);

  const [newProduct, setNewProduct] = useState({ name: "", description: "", category: "geral", image_url: "" });
  const [newVariation, setNewVariation] = useState({ name: "", price: 0, original_price: 0, credential_type: "account" as "account" | "key" });
  const [stockText, setStockText] = useState("");
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  // Queries
  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products-new"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: variations } = useQuery({
    queryKey: ["admin-variations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_variations")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as Variation[];
    },
  });

  // Stock text validation (after variations query)
  const stockValidation = useMemo(() => {
    if (!stockText.trim() || !showAddStock) return { lines: [], errors: [], duplicates: 0, valid: 0 };
    const lines = stockText.split("\n").map((l) => l.trim()).filter(Boolean);
    const seen = new Set<string>();
    let duplicates = 0;
    const errors: string[] = [];
    let valid = 0;
    const variation = variations?.find((v) => v.id === showAddStock);
    const credType = variation?.credential_type || "account";
    lines.forEach((line, i) => {
      if (seen.has(line)) { duplicates++; return; }
      seen.add(line);
      const result = credType === "key" ? validateKeyCredential(line) : validateAccountCredential(line);
      if (!result.valid) { errors.push(`Linha ${i + 1}: ${result.error}`); } else { valid++; }
    });
    return { lines, errors, duplicates, valid };
  }, [stockText, showAddStock, variations]);

  const { data: stockCounts } = useQuery({
    queryKey: ["admin-stock-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_stock")
        .select("variation_id, status");
      if (error) throw error;
      const counts: Record<string, { available: number; sold: number; total: number }> = {};
      data.forEach((item: { variation_id: string; status: string }) => {
        if (!counts[item.variation_id]) counts[item.variation_id] = { available: 0, sold: 0, total: 0 };
        counts[item.variation_id].total++;
        if (item.status === "available") counts[item.variation_id].available++;
        if (item.status === "sold") counts[item.variation_id].sold++;
      });
      return counts;
    },
  });

  const { data: stockItems } = useQuery({
    queryKey: ["admin-stock-items", expandedVariation],
    queryFn: async () => {
      if (!expandedVariation) return [];
      const { data, error } = await supabase
        .from("product_stock")
        .select("*")
        .eq("variation_id", expandedVariation)
        .order("added_at", { ascending: false });
      if (error) throw error;
      return data as StockItem[];
    },
    enabled: !!expandedVariation,
  });

  const { data: deliveryLogs } = useQuery({
    queryKey: ["admin-delivery-logs", showDeliveryLog],
    queryFn: async () => {
      if (!showDeliveryLog) return [];
      const { data, error } = await supabase
        .from("delivery_logs")
        .select("*")
        .eq("variation_id", showDeliveryLog)
        .order("delivered_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!showDeliveryLog,
  });

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: async (product: typeof newProduct) => {
      const { error } = await supabase.from("products").insert({
        name: product.name.trim(),
        description: product.description.trim() || null,
        category: product.category.trim(),
        image_url: product.image_url.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products-new"] });
      setShowNewProduct(false);
      setNewProduct({ name: "", description: "", category: "geral", image_url: "" });
      toast.success("Produto criado com sucesso!");
    },
    onError: () => toast.error("Erro ao criar produto"),
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { error } = await supabase.from("products").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products-new"] });
      setEditingProduct(null);
      toast.success("Produto atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products-new"] });
      toast.success("Produto removido!");
    },
    onError: () => toast.error("Erro ao remover"),
  });

  const createVariationMutation = useMutation({
    mutationFn: async ({ productId, variation }: { productId: string; variation: typeof newVariation }) => {
      const { error } = await supabase.from("product_variations").insert({
        product_id: productId,
        name: variation.name.trim(),
        price: variation.price,
        original_price: variation.original_price || null,
        credential_type: variation.credential_type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-variations"] });
      setShowNewVariation(null);
      setNewVariation({ name: "", price: 0, original_price: 0, credential_type: "account" });
      toast.success("Variação criada!");
    },
    onError: () => toast.error("Erro ao criar variação"),
  });

  const deleteVariationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_variations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-variations", "admin-stock-counts"] });
      toast.success("Variação removida!");
    },
    onError: () => toast.error("Erro ao remover variação"),
  });

  const addStockMutation = useMutation({
    mutationFn: async ({ variationId, credentials }: { variationId: string; credentials: string[] }) => {
      // Check for existing duplicates in DB
      const { data: existing } = await supabase
        .from("product_stock")
        .select("credential")
        .eq("variation_id", variationId)
        .in("credential", credentials);

      const existingSet = new Set(existing?.map((e) => e.credential) || []);
      const newCreds = credentials.filter((c) => !existingSet.has(c));

      if (newCreds.length === 0) {
        throw new Error("Todas as credenciais já existem no estoque");
      }

      if (existingSet.size > 0) {
        toast.warning(`${existingSet.size} credenciais duplicatas ignoradas`);
      }

      const items = newCreds.map((cred) => ({
        variation_id: variationId,
        credential: cred,
        status: "available" as const,
      }));
      const { error } = await supabase.from("product_stock").insert(items);
      if (error) throw error;
      return newCreds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["admin-stock-counts", "admin-stock-items"] });
      setShowAddStock(null);
      setStockText("");
      toast.success(`${count} credenciais adicionadas ao estoque!`);
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao adicionar estoque"),
  });

  const deleteStockMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_stock").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-stock-counts", "admin-stock-items"] });
      toast.success("Credencial removida!");
    },
    onError: () => toast.error("Erro ao remover"),
  });

  const toggleProductActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("products").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-products-new"] });
    },
  });

  const handleAddStock = (variationId: string) => {
    if (stockValidation.errors.length > 0) {
      toast.error("Corrija os erros de validação antes de adicionar");
      return;
    }
    const lines = stockText.split("\n").map((l) => l.trim()).filter(Boolean);
    const unique = [...new Set(lines)];
    if (unique.length === 0) return toast.error("Insira ao menos uma credencial");
    addStockMutation.mutate({ variationId, credentials: unique });
  };

  const copyCredential = (credential: string, id: string) => {
    navigator.clipboard.writeText(credential);
    setCopiedId(id);
    toast.success("Credencial copiada!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProductVariations = (productId: string) =>
    variations?.filter((v) => v.product_id === productId) || [];

  const getStockInfo = (variationId: string) =>
    stockCounts?.[variationId] || { available: 0, sold: 0, total: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-foreground">Produtos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie produtos, variações e estoque de credenciais</p>
        </div>
        <Button
          onClick={() => setShowNewProduct(true)}
          className="bg-gradient-gold text-primary-foreground font-display text-xs uppercase tracking-wider"
        >
          <Plus className="h-4 w-4 mr-1" /> Novo Produto
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar produtos por nome ou categoria..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-card border-border/40"
        />
      </div>

      {/* New Product Form */}
      <AnimatePresence>
        {showNewProduct && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl border border-primary/30 bg-card p-5 space-y-4"
          >
            <h3 className="font-display text-sm text-foreground">Novo Produto</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground">Nome *</label>
                <Input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Ex: Netflix Premium" className="bg-background" maxLength={100} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Categoria</label>
                <Input value={newProduct.category} onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })} placeholder="Ex: streaming" className="bg-background" maxLength={50} />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs text-muted-foreground">Descrição</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  placeholder="Descrição do produto..."
                  maxLength={500}
                  className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">URL da Imagem</label>
                <Input value={newProduct.image_url} onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })} placeholder="https://..." className="bg-background" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => createProductMutation.mutate(newProduct)} disabled={!newProduct.name.trim()} size="sm">
                Salvar
              </Button>
              <Button variant="outline" onClick={() => setShowNewProduct(false)} size="sm">
                Cancelar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products List */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {filteredProducts?.map((product) => {
            const pvariations = getProductVariations(product.id);
            const totalStock = pvariations.reduce((acc, v) => acc + (getStockInfo(v.id).available), 0);
            const isExpanded = expandedProduct === product.id;

            return (
              <motion.div
                key={product.id}
                layout
                className="rounded-2xl border border-border/40 bg-card overflow-hidden"
              >
                {/* Product Header */}
                <div
                  className="flex items-center gap-4 p-4 cursor-pointer hover:bg-muted/10 transition-colors"
                  onClick={() => setExpandedProduct(isExpanded ? null : product.id)}
                >
                  <div className="h-14 w-14 rounded-xl bg-muted/30 flex-shrink-0 overflow-hidden flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <Package className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-display text-sm text-foreground truncate">{product.name}</h3>
                      <Badge variant={product.active ? "default" : "secondary"} className="text-[10px]">
                        {product.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground capitalize">{product.category}</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground">{pvariations.length} variações</span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className={`text-xs font-medium ${totalStock > 0 ? "text-accent-foreground" : "text-destructive"}`}>
                        {totalStock > 0 ? `${totalStock} em estoque` : "⚠ Sem estoque"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleProductActive.mutate({ id: product.id, active: !product.active }); }}
                      className="p-2 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                      title={product.active ? "Desativar" : "Ativar"}
                    >
                      {product.active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingProduct(product.id); setEditForm(product); }}
                      className="p-2 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Remover este produto e todas as variações?")) deleteProductMutation.mutate(product.id);
                      }}
                      className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Edit Product Form */}
                <AnimatePresence>
                  {editingProduct === product.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border/20 bg-muted/5 p-4 space-y-3"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground">Nome</label>
                          <Input value={editForm.name || ""} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="bg-background" maxLength={100} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">Categoria</label>
                          <Input value={editForm.category || ""} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="bg-background" maxLength={50} />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground">URL da Imagem</label>
                          <Input value={editForm.image_url || ""} onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })} className="bg-background" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => updateProductMutation.mutate({ id: product.id, ...editForm })}>Salvar</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingProduct(null)}>Cancelar</Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Expanded - Variations */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-border/20"
                    >
                      <div className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-display text-xs text-muted-foreground uppercase tracking-wider">Variações</h4>
                          <Button size="sm" variant="outline" onClick={() => setShowNewVariation(product.id)} className="text-xs">
                            <Plus className="h-3 w-3 mr-1" /> Variação
                          </Button>
                        </div>

                        {/* New Variation Form */}
                        <AnimatePresence>
                          {showNewVariation === product.id && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="rounded-xl border border-primary/20 bg-muted/10 p-4 space-y-3"
                            >
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div>
                                  <label className="text-xs text-muted-foreground">Nome *</label>
                                  <Input value={newVariation.name} onChange={(e) => setNewVariation({ ...newVariation, name: e.target.value })} placeholder="Ex: 1 Mês" className="bg-background" maxLength={50} />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Preço (R$)</label>
                                  <Input type="number" step="0.01" min="0" value={newVariation.price} onChange={(e) => setNewVariation({ ...newVariation, price: +e.target.value })} className="bg-background" />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Preço Original (R$)</label>
                                  <Input type="number" step="0.01" min="0" value={newVariation.original_price} onChange={(e) => setNewVariation({ ...newVariation, original_price: +e.target.value })} className="bg-background" />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground">Tipo de Credencial</label>
                                  <select
                                    value={newVariation.credential_type}
                                    onChange={(e) => setNewVariation({ ...newVariation, credential_type: e.target.value as "account" | "key" })}
                                    className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-sm text-foreground h-10"
                                  >
                                    <option value="account">📧 Conta (email:senha)</option>
                                    <option value="key">🔑 Key (código único)</option>
                                  </select>
                                </div>
                              </div>

                              {/* Dynamic hint based on type */}
                              <div className="rounded-lg bg-muted/20 p-3 border border-border/20">
                                {newVariation.credential_type === "key" ? (
                                  <div className="flex items-start gap-2">
                                    <Key className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-foreground">Tipo: Key (código único)</p>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Cada key será entregue uma única vez. Após entrega, será marcada como usada automaticamente.
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-2">
                                    <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                    <div>
                                      <p className="text-xs font-medium text-foreground">Tipo: Conta (email:senha)</p>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">
                                        Credenciais no formato email:senha. Cada conta será entregue uma única vez ao comprador.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => createVariationMutation.mutate({ productId: product.id, variation: newVariation })} disabled={!newVariation.name.trim() || newVariation.price <= 0}>
                                  Salvar
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setShowNewVariation(null)}>
                                  Cancelar
                                </Button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Variations List */}
                        {pvariations.length === 0 ? (
                          <p className="text-xs text-muted-foreground py-4 text-center">Nenhuma variação cadastrada</p>
                        ) : (
                          <div className="space-y-2">
                            {pvariations.map((variation) => {
                              const stock = getStockInfo(variation.id);
                              const isVariationExpanded = expandedVariation === variation.id;

                              return (
                                <div key={variation.id} className="rounded-xl border border-border/30 overflow-hidden">
                                  <div
                                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/10 transition-colors"
                                    onClick={() => setExpandedVariation(isVariationExpanded ? null : variation.id)}
                                  >
                                    <div className="p-1.5 rounded-lg bg-muted/20">
                                      {variation.credential_type === "key" ? (
                                        <Key className="h-4 w-4 text-primary" />
                                      ) : (
                                        <Mail className="h-4 w-4 text-primary" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm text-foreground font-medium">{variation.name}</span>
                                        <Badge variant="outline" className="text-[10px]">
                                          {variation.credential_type === "key" ? "Key" : "Conta"}
                                        </Badge>
                                      </div>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs font-bold text-primary">R$ {Number(variation.price).toFixed(2)}</span>
                                        {variation.original_price && (
                                          <span className="text-xs text-muted-foreground line-through">R$ {Number(variation.original_price).toFixed(2)}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className="text-right">
                                        <span className={`text-xs font-bold ${stock.available > 0 ? "text-accent-foreground" : "text-destructive"}`}>
                                          {stock.available} disponíveis
                                        </span>
                                        <p className="text-[10px] text-muted-foreground">{stock.sold} vendidos</p>
                                      </div>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setShowDeliveryLog(showDeliveryLog === variation.id ? null : variation.id); }}
                                        className="p-2 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                                        title="Logs de entrega"
                                      >
                                        <ClipboardList className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={(e) => { e.stopPropagation(); setShowAddStock(variation.id); setStockText(""); }}
                                        className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                                        title="Adicionar estoque"
                                      >
                                        <Upload className="h-4 w-4" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (confirm("Remover esta variação e todo o estoque?")) deleteVariationMutation.mutate(variation.id);
                                        }}
                                        className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                      {isVariationExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                    </div>
                                  </div>

                                  {/* Add Stock Form - Dynamic based on credential type */}
                                  <AnimatePresence>
                                    {showAddStock === variation.id && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-border/20 bg-muted/5 p-4 space-y-3"
                                      >
                                        {/* Type-specific header */}
                                        <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/10">
                                          {variation.credential_type === "key" ? (
                                            <>
                                              <Key className="h-4 w-4 text-primary" />
                                              <span className="text-xs text-foreground font-medium">Adicionar Keys — Cole 1 código por linha</span>
                                            </>
                                          ) : (
                                            <>
                                              <Mail className="h-4 w-4 text-primary" />
                                              <span className="text-xs text-foreground font-medium">Adicionar Contas — Cole email:senha, 1 por linha</span>
                                            </>
                                          )}
                                        </div>

                                        <textarea
                                          value={stockText}
                                          onChange={(e) => setStockText(e.target.value)}
                                          placeholder={
                                            variation.credential_type === "key"
                                              ? "ABCD-1234-EFGH\nXYZ9-8888-TEST\nKEY3-5678-MNOP"
                                              : "email1@email.com:senha123\nemail2@email.com:senha456\nemail3@email.com:senha789"
                                          }
                                          className="w-full rounded-lg border border-border/40 bg-background px-3 py-2 text-xs text-foreground font-mono min-h-[140px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                                        />

                                        {/* Validation feedback */}
                                        <div className="space-y-1.5">
                                          <div className="flex items-center gap-4 text-[11px]">
                                            <span className="text-muted-foreground">
                                              {stockValidation.lines.length} linhas
                                            </span>
                                            <span className="text-accent-foreground">
                                              ✓ {stockValidation.valid} válidas
                                            </span>
                                            {stockValidation.duplicates > 0 && (
                                              <span className="text-primary">
                                                ⚠ {stockValidation.duplicates} duplicatas
                                              </span>
                                            )}
                                            {stockValidation.errors.length > 0 && (
                                              <span className="text-destructive">
                                                ✗ {stockValidation.errors.length} erros
                                              </span>
                                            )}
                                          </div>

                                          {stockValidation.errors.length > 0 && (
                                            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2 max-h-[80px] overflow-y-auto">
                                              {stockValidation.errors.slice(0, 5).map((err, i) => (
                                                <p key={i} className="text-[10px] text-destructive flex items-center gap-1">
                                                  <AlertTriangle className="h-3 w-3 shrink-0" />
                                                  {err}
                                                </p>
                                              ))}
                                              {stockValidation.errors.length > 5 && (
                                                <p className="text-[10px] text-destructive mt-1">
                                                  + {stockValidation.errors.length - 5} outros erros
                                                </p>
                                              )}
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex gap-2">
                                          <Button
                                            size="sm"
                                            onClick={() => handleAddStock(variation.id)}
                                            disabled={!stockText.trim() || stockValidation.valid === 0 || addStockMutation.isPending}
                                          >
                                            <Upload className="h-3 w-3 mr-1" />
                                            {addStockMutation.isPending ? "Adicionando..." : `Adicionar ${stockValidation.valid} credenciais`}
                                          </Button>
                                          <Button size="sm" variant="outline" onClick={() => { setShowAddStock(null); setStockText(""); }}>
                                            Cancelar
                                          </Button>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>

                                  {/* Delivery Logs */}
                                  <AnimatePresence>
                                    {showDeliveryLog === variation.id && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-border/20 bg-muted/5"
                                      >
                                        <div className="p-3">
                                          <h5 className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-display flex items-center gap-1.5">
                                            <ClipboardList className="h-3 w-3" /> Logs de Entrega
                                          </h5>
                                          <div className="max-h-[200px] overflow-y-auto">
                                            {deliveryLogs && deliveryLogs.length > 0 ? (
                                              <table className="w-full">
                                                <thead>
                                                  <tr className="bg-muted/10">
                                                    <th className="px-2 py-1.5 text-left text-[10px] text-muted-foreground uppercase">Credencial</th>
                                                    <th className="px-2 py-1.5 text-left text-[10px] text-muted-foreground uppercase">Comprador</th>
                                                    <th className="px-2 py-1.5 text-left text-[10px] text-muted-foreground uppercase">Data</th>
                                                  </tr>
                                                </thead>
                                                <tbody>
                                                  {deliveryLogs.map((log: any) => (
                                                    <tr key={log.id} className="border-t border-border/10">
                                                      <td className="px-2 py-1.5 text-[11px] text-foreground font-mono truncate max-w-[180px]">{log.credential_delivered}</td>
                                                      <td className="px-2 py-1.5 text-[10px] text-muted-foreground">{log.buyer_id?.slice(0, 8) || "—"}</td>
                                                      <td className="px-2 py-1.5 text-[10px] text-muted-foreground">
                                                        {new Date(log.delivered_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                                                      </td>
                                                    </tr>
                                                  ))}
                                                </tbody>
                                              </table>
                                            ) : (
                                              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma entrega registrada</p>
                                            )}
                                          </div>
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>

                                  {/* Stock Items */}
                                  <AnimatePresence>
                                    {isVariationExpanded && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="border-t border-border/20"
                                      >
                                        <div className="max-h-[300px] overflow-y-auto">
                                          {stockItems && stockItems.length > 0 ? (
                                            <table className="w-full">
                                              <thead>
                                                <tr className="bg-muted/10">
                                                  <th className="px-3 py-2 text-left text-[10px] text-muted-foreground uppercase">Credencial</th>
                                                  <th className="px-3 py-2 text-left text-[10px] text-muted-foreground uppercase">Status</th>
                                                  <th className="px-3 py-2 text-left text-[10px] text-muted-foreground uppercase">Data</th>
                                                  <th className="px-3 py-2 text-right text-[10px] text-muted-foreground uppercase">Ações</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {stockItems.map((item) => (
                                                  <tr key={item.id} className="border-t border-border/10 hover:bg-muted/5">
                                                    <td className="px-3 py-2 text-xs text-foreground font-mono truncate max-w-[200px]">
                                                      {item.credential}
                                                    </td>
                                                    <td className="px-3 py-2">
                                                      <Badge
                                                        variant={item.status === "available" ? "default" : "secondary"}
                                                        className="text-[10px]"
                                                      >
                                                        {item.status === "available" ? "Disponível" : item.status === "sold" ? "Vendido" : "Reservado"}
                                                      </Badge>
                                                    </td>
                                                    <td className="px-3 py-2 text-[10px] text-muted-foreground">
                                                      {new Date(item.added_at).toLocaleDateString("pt-BR")}
                                                      {item.sold_at && (
                                                        <p className="text-destructive">
                                                          Vendido: {new Date(item.sold_at).toLocaleDateString("pt-BR")}
                                                        </p>
                                                      )}
                                                    </td>
                                                    <td className="px-3 py-2 text-right">
                                                      <div className="flex items-center justify-end gap-1">
                                                        <button
                                                          onClick={() => copyCredential(item.credential, item.id)}
                                                          className="p-1 rounded text-muted-foreground hover:text-primary transition-colors"
                                                          title="Copiar credencial"
                                                        >
                                                          {copiedId === item.id ? (
                                                            <Check className="h-3 w-3 text-accent-foreground" />
                                                          ) : (
                                                            <Copy className="h-3 w-3" />
                                                          )}
                                                        </button>
                                                        {item.status === "available" && (
                                                          <button
                                                            onClick={() => deleteStockMutation.mutate(item.id)}
                                                            className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                                                          >
                                                            <Trash2 className="h-3 w-3" />
                                                          </button>
                                                        )}
                                                      </div>
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          ) : (
                                            <p className="text-xs text-muted-foreground text-center py-6">Nenhum item no estoque</p>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}

          {(!filteredProducts || filteredProducts.length === 0) && (
            <div className="text-center py-16 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum produto cadastrado</p>
              <p className="text-xs mt-1">Clique em "Novo Produto" para começar</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminProductsNew;
