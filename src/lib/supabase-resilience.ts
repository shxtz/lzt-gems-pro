/**
 * Supabase query resilience utilities.
 * Provides timeout, localStorage cache, and fallback patterns
 * to keep the UI functional during backend instability.
 */

/** Race a PromiseLike against a timeout – rejects on timeout */
export const withTimeout = <T,>(promise: PromiseLike<T>, ms = 8000): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), ms),
  );
  return Promise.race([Promise.resolve(promise), timeout]);
};

/** Read a JSON value from localStorage with a fallback */
export const readCache = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};

/** Write a JSON value to localStorage (fire-and-forget) */
export const writeCache = (key: string, value: unknown): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
};

/** Default react-query options for resilient Supabase queries */
export const resilientQueryOptions = {
  retry: 1,
  refetchOnWindowFocus: false,
  staleTime: 5 * 60 * 1000,
} as const;
