import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

let cfg: { server: string; token: string | null; onUnauthorized: () => void } = { server: '', token: null, onUnauthorized: () => {} };

export function configureApi(c: typeof cfg) {
  cfg = c;
}

export const apiServer = () => cfg.server;

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** Calls the liu liu server. Errors carry the server's message (always in Portuguese, ready to show). */
export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${cfg.server}${path}`, {
      method: init.method ?? 'GET',
      headers: { ...(init.body !== undefined ? { 'content-type': 'application/json' } : {}), ...(cfg.token ? { authorization: `Bearer ${cfg.token}` } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
    });
  } catch {
    throw new ApiError('Sem conexão com o servidor.', 0);
  }
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) cfg.onUnauthorized();
  if (!res.ok) throw new ApiError(body?.error ?? `Erro ${res.status}`, res.status);
  return body as T;
}

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: (n, e) => n < 2 && !(e instanceof ApiError && e.status >= 400 && e.status < 500) } },
});

/** GET a screen's data. The path is the cache key, so the same URL is shared between screens. */
export function useApi<T>(path: string | null) {
  return useQuery<T, ApiError>({ queryKey: [path], queryFn: ({ signal }) => api<T>(path!, { signal }), enabled: !!path });
}

/**
 * A change on the server (edit a transaction, sync, a chat that recorded a spend…). Afterwards every
 * screen reloads, as router.refresh() does on the web.
 */
export function useApiMutation<V, R = unknown>(fn: (v: V) => Promise<R>) {
  const qc = useQueryClient();
  return useMutation<R, ApiError, V>({ mutationFn: fn, onSuccess: () => qc.invalidateQueries() });
}

export const refreshAll = () => queryClient.invalidateQueries();
