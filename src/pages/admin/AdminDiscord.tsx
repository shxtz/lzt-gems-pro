import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { RefreshCw, Send, Users, Shield, Webhook, CheckCircle, AlertCircle } from "lucide-react";

const AdminDiscord = () => {
  const queryClient = useQueryClient();
  const [manualDiscordId, setManualDiscordId] = useState("");
  const [manualRoleId, setManualRoleId] = useState("");

  const { data: profiles } = useQuery({
    queryKey: ["admin-discord-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, email, display_name, discord_id, restorecord_verified")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const withDiscord = profiles?.filter((p) => p.discord_id) || [];
  const withoutDiscord = profiles?.filter((p) => !p.discord_id) || [];
  const verified = profiles?.filter((p) => p.restorecord_verified) || [];

  const syncAllMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("sync-discord-ids");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-discord-profiles"] });
      toast.success("Sincronização de todos os Discord IDs iniciada!");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setRoleMutation = useMutation({
    mutationFn: async () => {
      if (!manualDiscordId) throw new Error("Discord ID é obrigatório");
      const { error } = await supabase.functions.invoke("discord-set-role", {
        body: { discordId: manualDiscordId, roleId: manualRoleId || undefined },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cargo atribuído com sucesso!");
      setManualDiscordId("");
      setManualRoleId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const setRoleForAll = useMutation({
    mutationFn: async () => {
      const discordIds = withDiscord.map((p) => p.discord_id).filter(Boolean);
      if (!discordIds.length) throw new Error("Nenhum usuário com Discord ID");

      let success = 0;
      for (const discordId of discordIds) {
        try {
          await supabase.functions.invoke("discord-set-role", { body: { discordId } });
          success++;
        } catch {
          // continue with next
        }
      }
      return success;
    },
    onSuccess: (count) => {
      toast.success(`Cargo de cliente atribuído a ${count} usuários!`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const testWebhookMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("discord-sale-webhook", {
        body: { test: true },
      });
      if (error) throw error;
    },
    onSuccess: () => toast.success("Webhook de teste enviado!"),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-foreground">Integração Discord</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border/30 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{withDiscord.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Com Discord</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/30 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{withoutDiscord.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sem Discord</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border/30 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{verified.length}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">RestoreCord Verificados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sync Discord IDs */}
        <div className="rounded-2xl border border-border/30 bg-card p-5 space-y-3">
          <h2 className="font-display text-sm text-foreground flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-primary" /> Sincronizar Discord IDs
          </h2>
          <p className="text-xs text-muted-foreground">
            Busca e vincula Discord IDs de todos os usuários sem vínculo, usando a API do RestoreCord.
          </p>
          <Button
            onClick={() => syncAllMutation.mutate()}
            disabled={syncAllMutation.isPending}
            className="w-full bg-gradient-gold text-primary-foreground gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncAllMutation.isPending ? "animate-spin" : ""}`} />
            {syncAllMutation.isPending ? "Sincronizando..." : "Sincronizar Todos"}
          </Button>
        </div>

        {/* Set Role for All */}
        <div className="rounded-2xl border border-border/30 bg-card p-5 space-y-3">
          <h2 className="font-display text-sm text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Cargo de Cliente em Massa
          </h2>
          <p className="text-xs text-muted-foreground">
            Atribui o cargo de cliente a todos os {withDiscord.length} usuários com Discord vinculado.
          </p>
          <Button
            onClick={() => {
              if (confirm(`Atribuir cargo a ${withDiscord.length} usuários?`)) setRoleForAll.mutate();
            }}
            disabled={setRoleForAll.isPending || withDiscord.length === 0}
            variant="outline"
            className="w-full gap-2"
          >
            <Shield className={`h-4 w-4 ${setRoleForAll.isPending ? "animate-spin" : ""}`} />
            {setRoleForAll.isPending ? "Atribuindo..." : "Atribuir Cargo a Todos"}
          </Button>
        </div>
      </div>

      {/* Manual Role */}
      <div className="rounded-2xl border border-border/30 bg-card p-5 space-y-4">
        <h2 className="font-display text-sm text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Atribuir Cargo Manual
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Discord ID</label>
            <Input value={manualDiscordId} onChange={(e) => setManualDiscordId(e.target.value)} placeholder="123456789..." />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Role ID (opcional, padrão: cliente)</label>
            <Input value={manualRoleId} onChange={(e) => setManualRoleId(e.target.value)} placeholder="Usar padrão..." />
          </div>
          <div className="flex items-end">
            <Button
              onClick={() => setRoleMutation.mutate()}
              disabled={setRoleMutation.isPending || !manualDiscordId}
              className="w-full bg-gradient-gold text-primary-foreground gap-2"
            >
              <Send className="h-4 w-4" />
              Atribuir
            </Button>
          </div>
        </div>
      </div>

      {/* Test Webhook */}
      <div className="rounded-2xl border border-border/30 bg-card p-5 space-y-3">
        <h2 className="font-display text-sm text-foreground flex items-center gap-2">
          <Webhook className="h-4 w-4 text-primary" /> Testar Webhook de Vendas
        </h2>
        <p className="text-xs text-muted-foreground">
          Envia uma mensagem de teste para o webhook de vendas do Discord.
        </p>
        <Button
          onClick={() => testWebhookMutation.mutate()}
          disabled={testWebhookMutation.isPending}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Send className="h-3.5 w-3.5" />
          {testWebhookMutation.isPending ? "Enviando..." : "Enviar Teste"}
        </Button>
      </div>

      {/* Users without Discord */}
      {withoutDiscord.length > 0 && (
        <div className="rounded-2xl border border-border/30 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/20">
            <h2 className="font-display text-sm text-foreground">
              Usuários sem Discord ({withoutDiscord.length})
            </h2>
          </div>
          <div className="divide-y divide-border/10 max-h-[300px] overflow-y-auto">
            {withoutDiscord.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between px-5 py-2.5">
                <div>
                  <p className="text-sm text-foreground">{p.display_name || p.email}</p>
                  <p className="text-[10px] text-muted-foreground">{p.email}</p>
                </div>
                <span className="text-[10px] text-yellow-500">Sem vínculo</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDiscord;
