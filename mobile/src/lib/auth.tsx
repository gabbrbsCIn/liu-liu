import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { configureApi } from './api';
import { storage } from './storage';

const SERVER_KEY = 'liu.server';
const TOKEN_KEY = 'liu.token';

/** Server address the app suggests on the login screen (set EXPO_PUBLIC_API_URL when building). */
export const DEFAULT_SERVER = process.env.EXPO_PUBLIC_API_URL ?? '';

type Auth = {
  ready: boolean;
  server: string;
  token: string | null;
  signIn: (server: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Auth | null>(null);

export const normalizeServer = (s: string) => {
  const t = s.trim().replace(/\/+$/, '');
  return t && !/^https?:\/\//.test(t) ? `https://${t}` : t;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [server, setServer] = useState(DEFAULT_SERVER);
  const [token, setToken] = useState<string | null>(null);

  const signOut = useCallback(async () => {
    await storage.remove(TOKEN_KEY);
    setToken(null);
  }, []);

  useEffect(() => {
    (async () => {
      const [s, t] = await Promise.all([storage.get(SERVER_KEY), storage.get(TOKEN_KEY)]);
      if (s) setServer(s);
      setToken(t);
      setReady(true);
    })();
  }, []);

  // Every request goes to the current server with the current token; a 401 sends you back to login.
  // Set during render, not in an effect: the screens' queries start in their own effects, which run first.
  configureApi({ server, token, onUnauthorized: signOut });

  const signIn = useCallback(async (rawServer: string, password: string) => {
    const s = normalizeServer(rawServer);
    if (!s) throw new Error('Informe o endereço do servidor.');
    const r = await fetch(`${s}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) })
      .then(async (x) => ({ ok: x.ok, body: await x.json().catch(() => ({})) }))
      .catch(() => ({ ok: false, body: { error: 'Não consegui falar com o servidor. Confira o endereço e a internet.' } }));
    if (!r.ok || !r.body.token) throw new Error(r.body.error ?? 'Não deu para entrar.');
    await Promise.all([storage.set(SERVER_KEY, s), storage.set(TOKEN_KEY, r.body.token)]);
    setServer(s);
    setToken(r.body.token);
  }, []);

  const value = useMemo(() => ({ ready, server, token, signIn, signOut }), [ready, server, token, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth fora do AuthProvider');
  return v;
}
