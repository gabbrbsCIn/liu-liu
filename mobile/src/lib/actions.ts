import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { api, apiServer, refreshAll } from './api';

let pendingAsk: string | null = null;

/**
 * Opens the conversation with liu liu, optionally sending a question right away (the web's askLiu).
 * The question stays in memory, not in the URL: a liuliu://chat?q=… link from outside the app must
 * never send a message by itself (the chat can record spending and recategorize).
 */
export function askLiu(q?: string) {
  pendingAsk = q ?? null;
  router.push('/chat');
}

/** The question askLiu() left for the chat, handed over once. */
export function takePendingAsk() {
  const q = pendingAsk;
  pendingAsk = null;
  return q;
}

type ConnectState = { step: 'idle' } | { step: 'opening' } | { step: 'importing'; bank: string } | { step: 'done'; text: string } | { step: 'error'; text: string };

/**
 * Connect a bank through Pluggy. The widget runs on the server's /conectar page inside the system browser
 * (popups and the bank's OAuth work there), which sends the new item back to the app by deep link.
 */
export function useConnectBank() {
  const [state, setState] = useState<ConnectState>({ step: 'idle' });

  async function connect() {
    setState({ step: 'opening' });
    try {
      const { accessToken } = await api<{ accessToken: string }>('/api/pluggy/connect-token', { method: 'POST', body: {} });
      const back = Linking.createURL('conectado');
      const url = `${apiServer()}/conectar?${new URLSearchParams({ token: accessToken, volta: back })}`;
      const r = await WebBrowser.openAuthSessionAsync(url, back);
      if (r.type !== 'success') return setState({ step: 'idle' });
      const { queryParams } = Linking.parse(r.url);
      const itemId = typeof queryParams?.itemId === 'string' ? queryParams.itemId : null;
      if (queryParams?.erro) return setState({ step: 'error', text: String(queryParams.erro) });
      if (!itemId) return setState({ step: 'idle' });
      const bank = typeof queryParams?.banco === 'string' && queryParams.banco ? queryParams.banco : 'Banco';
      setState({ step: 'importing', bank });
      const res = await api<{ transactions: number; accounts: number }>('/api/pluggy/items', { method: 'POST', body: { itemId } });
      setState({ step: 'done', text: `${bank} conectado. Importei ${res.transactions} transações de ${res.accounts} contas.` });
      refreshAll();
    } catch (e) {
      setState({ step: 'error', text: (e as Error).message });
    }
  }

  return { state, connect, reset: () => setState({ step: 'idle' }) };
}

type SyncResponse = { error?: string; errors?: string[]; transactions?: number; refresh?: { name: string; requested: boolean }[]; nextAuto?: string | null };

/** Same message as the web's sync button. */
export function describeSync(r: SyncResponse): string {
  if (r.error) return `Não deu para atualizar: ${r.error}`;
  const parts = [`${r.transactions ?? 0} transações conferidas.`];
  const asked = (r.refresh ?? []).filter((x) => x.requested).map((x) => x.name);
  if (asked.length) parts.push(`Pedi dados novos a ${asked.join(', ')}: chegam em alguns minutos e entram sozinhos.`);
  if ((r.refresh ?? []).some((x) => !x.requested && /meu ?pluggy/i.test(x.name))) {
    const when = r.nextAuto ? new Date(r.nextAuto).toLocaleString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : null;
    parts.push(`O MeuPluggy atualiza sozinho uma vez por dia${when ? ` (próxima: ${when})` : ''}, e o liu liu importa assim que terminar.`);
  }
  if (r.errors?.length) parts.push(`Falhou: ${r.errors.join('; ')}`);
  return parts.join(' ');
}

export async function syncNow(): Promise<string> {
  try {
    const r = await api<SyncResponse>('/api/sync', { method: 'POST' });
    refreshAll();
    return describeSync(r);
  } catch (e) {
    return describeSync({ error: (e as Error).message });
  }
}

export function ago(iso: string | null) {
  if (!iso) return 'nunca sincronizado';
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'atualizado agora';
  if (min < 60) return `atualizado há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `atualizado há ${h} h`;
  return `atualizado há ${Math.round(h / 24)} d`;
}
