import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  authReady: boolean;
  roleLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_PREFIX = `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}`;

const clearStoredAuthState = () => {
  if (typeof window === "undefined") return;

  [window.localStorage, window.sessionStorage].forEach((storage) => {
    Object.keys(storage)
      .filter((key) => key.startsWith(AUTH_STORAGE_PREFIX))
      .forEach((key) => storage.removeItem(key));
  });
};

/** Race a promise against a timeout – returns null on timeout */
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [roleLoading, setRoleLoading] = useState(false);

  const checkAdmin = async (userId: string) => {
    setRoleLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(!!data);
    } catch {
      setIsAdmin(false);
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const syncAuthState = (nextSession: Session | null) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
      setAuthReady(true);

      if (nextSession?.user) {
        void checkAdmin(nextSession.user.id);
      } else {
        setIsAdmin(false);
        setRoleLoading(false);
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      syncAuthState(nextSession);
    });

    supabase.auth
      .getSession()
      .then((result) => withTimeout(Promise.resolve(result), 6000))
      .then(async (result) => {
        if (!result) {
          // Timed out – session is stuck, clear and continue
          clearStoredAuthState();
          try { await supabase.auth.signOut({ scope: "local" }); } catch {}
          syncAuthState(null);
          return;
        }

        const { data: { session: initialSession }, error } = result;
        if (error) {
          clearStoredAuthState();
          try { await supabase.auth.signOut({ scope: "local" }); } catch {}
          syncAuthState(null);
          return;
        }

        syncAuthState(initialSession);
      })
      .catch(() => {
        clearStoredAuthState();
        if (!mounted) return;
        setSession(null);
        setUser(null);
        setIsAdmin(false);
        setRoleLoading(false);
        setLoading(false);
        setAuthReady(true);
      });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        10000,
      );
      if (!result) return { error: new Error("Timeout ao conectar. Tente novamente.") };
      return { error: result.error as Error | null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error("Erro desconhecido") };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      const result = await withTimeout(
        supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        }),
        10000,
      );
      if (!result) return { error: new Error("Timeout ao conectar. Tente novamente.") };
      return { error: result.error as Error | null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error("Erro desconhecido") };
    }
  };

  const signOut = async () => {
    clearStoredAuthState();
    await supabase.auth.signOut({ scope: "local" });
    setSession(null);
    setUser(null);
    setIsAdmin(false);
    setRoleLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, authReady, roleLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
