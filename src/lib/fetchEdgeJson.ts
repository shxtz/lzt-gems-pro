type FetchEdgeJsonOptions = RequestInit & {
  retries?: number;
  retryDelayMs?: number;
  cacheTtlMs?: number;
};

const inFlightRequests = new Map<string, Promise<unknown>>();
const responseCache = new Map<string, { expiresAt: number; data: unknown }>();

const MAX_CONCURRENT = 3;
let activeCount = 0;
const waitQueue: Array<() => void> = [];

const acquireSlot = (): Promise<void> => {
  if (activeCount < MAX_CONCURRENT) {
    activeCount++;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => waitQueue.push(resolve));
};

const releaseSlot = () => {
  activeCount--;
  const next = waitQueue.shift();
  if (next) {
    activeCount++;
    next();
  }
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseJsonSafely = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const isBootErrorPayload = (payload: unknown) =>
  typeof payload === "object" && payload !== null && "code" in payload && (payload as { code?: string }).code === "BOOT_ERROR";

export async function fetchEdgeJson<T = any>(url: string, options: FetchEdgeJsonOptions = {}): Promise<T> {
  const {
    retries = 2,
    retryDelayMs = 400,
    cacheTtlMs = 60_000,
    method = "GET",
    ...requestInit
  } = options;

  const normalizedMethod = method.toUpperCase();
  const useCache = normalizedMethod === "GET";
  const cacheKey = `${normalizedMethod}:${url}`;

  if (useCache) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data as T;
    }
    const inFlight = inFlightRequests.get(cacheKey);
    if (inFlight) return inFlight as Promise<T>;
  }

  const runRequest = async (): Promise<T> => {
    await acquireSlot();
    try {
      return await executeWithRetries();
    } finally {
      releaseSlot();
    }
  };

  const executeWithRetries = async (): Promise<T> => {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10_000);
        const response = await fetch(url, {
          ...requestInit,
          method: normalizedMethod,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const text = await response.text();
        const payload = text ? parseJsonSafely(text) : null;
        if (response.ok) return payload as T;
        const shouldRetry = response.status === 503 && isBootErrorPayload(payload) && attempt < retries;
        if (shouldRetry) { await wait(retryDelayMs * (attempt + 1)); continue; }
        const message = typeof payload === "object" && payload !== null && "error" in payload
          ? String((payload as { error?: unknown }).error ?? `HTTP ${response.status}`)
          : `HTTP ${response.status}`;
        throw new Error(message);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Request failed");
        if (attempt < retries) { await wait(retryDelayMs * (attempt + 1)); continue; }
      }
    }
    throw lastError ?? new Error("Request failed");
  };

  const requestPromise = runRequest();
  if (useCache) inFlightRequests.set(cacheKey, requestPromise);
  try {
    const data = await requestPromise;
    if (useCache) responseCache.set(cacheKey, { expiresAt: Date.now() + cacheTtlMs, data });
    return data;
  } finally {
    if (useCache) inFlightRequests.delete(cacheKey);
  }
}
