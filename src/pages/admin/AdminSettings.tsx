const AdminSettings = () => {
  return (
    <div>
      <h1 className="font-display text-2xl text-foreground mb-6">Configurações</h1>
      <div className="rounded-2xl border border-border/40 bg-card p-6 space-y-6">
        <div>
          <h2 className="font-display text-sm text-foreground mb-2">Integrações</h2>
          <p className="text-xs text-muted-foreground mb-4">Configure as APIs e serviços externos.</p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground font-medium">Efi Bank (Pagamentos)</p>
                  <p className="text-xs text-muted-foreground">Processar pagamentos via PIX</p>
                </div>
                <span className="text-xs text-yellow-500">Pendente</span>
              </div>
            </div>
            <div className="rounded-xl border border-border/30 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground font-medium">LZT Market (Contas)</p>
                  <p className="text-xs text-muted-foreground">Importar e vender contas de jogos</p>
                </div>
                <span className="text-xs text-yellow-500">Pendente</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
