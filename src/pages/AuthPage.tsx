import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { LogIn, UserPlus, AlertCircle, Mail, Lock, User } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        setError("Email ou senha inválidos");
      } else {
        toast.success("Login realizado com sucesso!");
        navigate("/");
      }
    } else {
      if (password.length < 6) {
        setError("A senha deve ter pelo menos 6 caracteres");
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password);
      if (error) {
        setError("Erro ao criar conta. Tente outro email.");
      } else {
        toast.success("Conta criada! Verifique seu email para confirmar.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
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
            {isLogin ? "Acesse sua conta" : "Crie sua conta para comprar"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
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
              />
            </div>
          </div>

          <motion.button
            type="submit"
            disabled={loading}
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
