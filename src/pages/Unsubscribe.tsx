import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, XCircle, MailX } from "lucide-react";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) { setStatus("invalid"); return; }
    const validate = async () => {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const data = await res.json();
        if (data.valid === false && data.reason === "already_unsubscribed") setStatus("already");
        else if (data.valid) setStatus("valid");
        else setStatus("invalid");
      } catch { setStatus("error"); }
    };
    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", { body: { token } });
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch { setStatus("error"); }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-card p-8 text-center">
        {status === "loading" && (
          <>
            <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Verificando...</p>
          </>
        )}
        {status === "valid" && (
          <>
            <MailX className="h-12 w-12 text-primary mx-auto mb-4" />
            <h1 className="font-display text-xl text-foreground mb-2">Cancelar inscrição</h1>
            <p className="text-muted-foreground text-sm mb-6">
              Tem certeza que deseja cancelar o recebimento de e-mails da VBUCKS BARATO?
            </p>
            <button onClick={handleUnsubscribe} className="w-full rounded-xl bg-destructive text-destructive-foreground py-3 font-display text-sm font-bold uppercase tracking-wider hover:opacity-90 transition-opacity">
              Confirmar cancelamento
            </button>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
            <h1 className="font-display text-xl text-foreground mb-2">Inscrição cancelada</h1>
            <p className="text-muted-foreground text-sm">Você não receberá mais e-mails da VBUCKS BARATO.</p>
          </>
        )}
        {status === "already" && (
          <>
            <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h1 className="font-display text-xl text-foreground mb-2">Já cancelado</h1>
            <p className="text-muted-foreground text-sm">Sua inscrição já foi cancelada anteriormente.</p>
          </>
        )}
        {(status === "invalid" || status === "error") && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="font-display text-xl text-foreground mb-2">Link inválido</h1>
            <p className="text-muted-foreground text-sm">Este link é inválido ou expirou.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default Unsubscribe;
