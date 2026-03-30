import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, UserPlus, AlertCircle, Mail, Lock, User, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const RESTORECORD_VERIFY_URL = "https://discord.com/oauth2/authorize?client_id=1158525654359355524&redirect_uri=https://restorecord.com/api/callback&response_type=code&scope=identify+guilds.join&state=1427086108063174698&prompt=none";
const VERIFIED_DISCORD_STORAGE_KEY = "restorecord_verified";
const PENDING_DISCORD_LINK_STORAGE_KEY = "restorecord_pending_link";

interface DiscordVerification {
  discord_id: string | null;
  username: string;
  avatar: string | null;
}

interface PendingDiscordLink extends DiscordVerification {
  display_name: string;
  email: string;
}

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [discordVerification, setDiscordVerification] = useState<DiscordVerification | null>(null);
  const appliedDiscordIdRef = useRef<string | null>(null);
  const verificationAppliedRef = useRef(false);

  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (!user) return;

    const pendingRaw = localStorage.getItem(PENDING_DISCORD_LINK_STORAGE_KEY);
    if (!pendingRaw) {
      navigate("/");
      return;
    }

    let cancelled = false;

    const finalizePendingDiscordLink = async () => {
      try {
        const pending = JSON.parse(pendingRaw) as PendingDiscordLink;
        let linkError: Error | null = null;

        if (pending.discord_id) {
          const { error } = await supabase.functions.invoke("restorecord-verify", {
            body: {
              action: "link_profile",
              discord_id: pending.discord_id,
              display_name: pending.display_name,
            },
          });

          linkError = error ? new Error(error.message) : null;
        }

        if (!pending.discord_id || linkError) {
          const { error: retryError } = await supabase.functions.invoke("retry-discord-lookup", {
            body: {
              userId: user.id,
              email: pending.email,
            },
          });

          if (retryError) {
            throw retryError;
          }
        }

        localStorage.removeItem(PENDING_DISCORD_LINK_STORAGE_KEY);
        localStorage.removeItem(VERIFIED_DISCORD_STORAGE_KEY);

        if (!cancelled) {
          setDiscordVerification({
            discord_id: pending.discord_id,
            username: pending.username,
            avatar: pending.avatar,
          });
          toast.success("Discord vinculado com sucesso!");
        }
      } catch {
        if (!cancelled) {
          toast.error("Não foi possível concluir a vinculação do Discord.");
        }
      } finally {
        if (!cancelled) {
          navigate("/");
        }
      }
    };

    void finalizePendingDiscordLink();

    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  const applyDiscordVerification = (payload: DiscordVerification) => {
    appliedDiscordIdRef.current = payload.discord_id;
    setDiscordVerification(payload);
    setDisplayName((current) => current || payload.username || "");
    setIsLogin(false);
    setError("");

    try {
      localStorage.setItem(
        VERIFIED_DISCORD_STORAGE_KEY,
        JSON.stringify({ type: "RESTORECORD_VERIFIED", ...payload }),
      );
    } catch {}
  };

  // Check for RestoreCord callback params (same-tab redirect fallback)
  useEffect(() => {
    const verified = searchParams.get("restorecord_verified");

    if (verified === "1") {
      const alreadyApplied = appliedDiscordIdRef.current === "__verified__";
      applyDiscordVerification({
        discord_id: null,
        username: "Discord verificado",
        avatar: null,
      });
      if (!alreadyApplied) {
        appliedDiscordIdRef.current = "__verified__";
        toast.success("Discord verificado! Preencha os dados para criar sua conta.");
      }
    }
  }, [searchParams]);

  // Listen for postMessage from popup callback
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "RESTORECORD_VERIFIED") {
        const alreadyApplied = event.data.discord_id ? appliedDiscordIdRef.current === event.data.discord_id : false;
        applyDiscordVerification({
          discord_id: event.data.discord_id || null,
          username: event.data.username || "Discord verificado",
          avatar: event.data.avatar || null,
        });
        if (!alreadyApplied) {
          toast.success(`Discord verificado: ${event.data.username || "pronto para cadastro"}`);
        }
      }
    };
    window.addEventListener("message", handler);

    // Also poll localStorage as fallback (in case postMessage was missed)
    const poll = setInterval(() => {
      try {
        const stored = localStorage.getItem(VERIFIED_DISCORD_STORAGE_KEY);
        if (stored) {
          const data = JSON.parse(stored);
          if (data?.type === "RESTORECORD_VERIFIED") {
            const alreadyApplied = data.discord_id ? appliedDiscordIdRef.current === data.discord_id : false;
            applyDiscordVerification({
              discord_id: data.discord_id || null,
              username: data.username || "Discord verificado",
              avatar: data.avatar || null,
            });
            if (!alreadyApplied) {
              toast.success(`Discord verificado: ${data.username || "pronto para cadastro"}`);
            }
          }
        }
      } catch {}
    }, 500);

    return () => {
      window.removeEventListener("message", handler);
      clearInterval(poll);
    };
  }, []);

  const openRestoreCord = () => {
    const popup = window.open(RESTORECORD_VERIFY_URL, "restorecord_verify", "width=500,height=700,scrollbars=yes");
    if (!popup) {
      // Popup blocked, fallback to same tab
      window.open(RESTORECORD_VERIFY_URL, "_blank");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message.includes("Timeout") ? error.message : "Email ou senha inválidos");
      } else {
        toast.success("Login realizado com sucesso!");
        if (!localStorage.getItem(PENDING_DISCORD_LINK_STORAGE_KEY)) {
          navigate("/");
        }
      }
    } else {
      if (!discordVerification) {
        setError("Vincule e verifique seu Discord antes de criar conta.");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres");
        setLoading(false);
        return;
      }

      const pendingDiscordLink: PendingDiscordLink = {
        ...discordVerification,
        email,
        display_name: displayName.trim() || discordVerification.username,
      };

      try {
        localStorage.setItem(PENDING_DISCORD_LINK_STORAGE_KEY, JSON.stringify(pendingDiscordLink));
      } catch {}

      const { error: signUpError } = await signUp(email, password);
      if (signUpError) {
        try { localStorage.removeItem(PENDING_DISCORD_LINK_STORAGE_KEY); } catch {}
        setError(signUpError.message.includes("Timeout") ? signUpError.message : "Erro ao criar conta. Tente outro email.");
      } else {
        toast.success("Conta criada! Confirme seu email e faça login para concluir a vinculação do Discord.");
      }
    }
    setLoading(false);
  };

  const isSignupReady = isLogin || !!discordVerification;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img src={logo} alt="VBucks Barato" className="h-16 w-16 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-gradient-gold">
            {isLogin ? "ENTRAR" : "CRIAR CONTA"}
          </h1>
          <p className="font-body text-sm text-muted-foreground mt-2">
            {isLogin ? "Acesse sua conta" : "Vincule seu Discord e crie sua conta"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Discord verification section - only on signup */}
          {!isLogin && (
            <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <svg className="h-5 w-5 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                <span className="font-display text-sm font-bold text-foreground">Verificação Discord</span>
                {discordVerification && (
                  <CheckCircle2 className="h-4 w-4 text-green-500 ml-auto" />
                )}
              </div>

              {discordVerification ? (
                <div className="flex items-center gap-3 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2.5">
                  {discordVerification.avatar && (
                    <img src={discordVerification.avatar} alt="" className="h-8 w-8 rounded-full" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{discordVerification.username}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{discordVerification.discord_id}</p>
                  </div>
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                </div>
              ) : (
                <>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Para criar conta, primeiro verifique no nosso servidor Discord clicando no botão abaixo.
                  </p>

                  <button
                    type="button"
                    onClick={openRestoreCord}
                    className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2.5 text-xs font-bold text-white uppercase tracking-wider hover:bg-[#4752c4] transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Verificar no Discord
                  </button>
                </>
              )}
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Nome
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-xl border border-border/40 bg-card pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  placeholder="Seu nome"
                  disabled={!isSignupReady}
                />
              </div>
            </div>
          )}

          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-card pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="seu@email.com"
                required
                disabled={!isLogin && !isSignupReady}
              />
            </div>
          </div>

          <div>
            <label className="font-body text-xs text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-card pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="••••••••"
                required
                disabled={!isLogin && !isSignupReady}
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading || (!isLogin && !isSignupReady)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-gold px-6 py-3 font-display text-sm font-bold uppercase tracking-wider text-primary-foreground shadow-gold disabled:opacity-50"
          >
            {isLogin ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            {loading ? "Aguarde..." : isLogin ? "Entrar" : "Criar Conta"}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            className="font-body text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => navigate("/")}
            className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Voltar para o site
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
