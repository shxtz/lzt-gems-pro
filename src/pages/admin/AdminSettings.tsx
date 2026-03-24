import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Save, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const AdminSettings = () => {
  const queryClient = useQueryClient();
  const [pixKey, setPixKey] = useState("");

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("*");
      if (error) throw error;
      const map: Record<string, any> = {};
      data?.forEach((s) => { map[s.key] = s.value; });
      return map;
    },
  });

  const saveSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("site_settings").update({ value }).eq("key", key);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_settings").insert({ key, value });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success("Configuração salva!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-foreground">Configurações</h1>

      {/* Integrations Status */}
      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
        <h2 className="font-display text-sm text-foreground uppercase tracking-wider">Integrações</h2>

        <div className="space-y-3">
          <div className="rounded-xl border border-border/30 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground font-medium">Efi Bank (PIX)</p>
              <p className="text-xs text-muted-foreground">Pagamentos via PIX</p>
            </div>
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Configurado</span>
            </div>
          </div>

          <div className="rounded-xl border border-border/30 p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground font-medium">LZT Market</p>
              <p className="text-xs text-muted-foreground">Importação de contas</p>
            </div>
            <div className="flex items-center gap-2 text-yellow-500">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Pendente API Key</span>
            </div>
          </div>
        </div>
      </div>

      {/* PIX Key */}
      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
        <h2 className="font-display text-sm text-foreground uppercase tracking-wider">Chave PIX</h2>
        <p className="text-xs text-muted-foreground">Chave PIX para receber pagamentos (cadastrada na Efi)</p>
        <div className="flex gap-2">
          <input
            value={pixKey || (settings?.pix_key as string) || ""}
            onChange={(e) => setPixKey(e.target.value)}
            className="flex-1 rounded-xl border border-border/40 bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            placeholder="email@exemplo.com ou CPF/CNPJ"
          />
          <button
            onClick={() => saveSetting.mutate({ key: "pix_key", value: pixKey })}
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 font-display text-xs font-bold text-primary-foreground uppercase"
          >
            <Save className="h-3 w-3" /> Salvar
          </button>
        </div>
      </div>

      {/* Site Settings */}
      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-4">
        <h2 className="font-display text-sm text-foreground uppercase tracking-wider">Configurações do Site</h2>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Nome do Site</label>
            <input
              defaultValue={(settings?.site_name as string) || "VBucks Barato"}
              onBlur={(e) => saveSetting.mutate({ key: "site_name", value: e.target.value })}
              className="w-full rounded-xl border border-border/40 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">WhatsApp Suporte</label>
            <input
              defaultValue={(settings?.whatsapp as string) || ""}
              onBlur={(e) => saveSetting.mutate({ key: "whatsapp", value: e.target.value })}
              className="w-full rounded-xl border border-border/40 bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              placeholder="+55 11 99999-9999"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
