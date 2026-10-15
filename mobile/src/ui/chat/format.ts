// Same helpers as the web's ChatDrawer.

/** Postgres text timestamps ("2026-10-03 00:12:34.1+00") into something Date understands. */
export const parseTs = (s: string) => new Date(s.replace(' ', 'T').replace(/([+-]\d\d)$/, '$1:00'));

export const newId = () => `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export const hhmm = (d = new Date()) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

/** "hoje, 14:32" or "03 de out." for the conversation list. */
export function when(iso: string) {
  const d = parseTs(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return same ? `hoje, ${hhmm(d)}` : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export const SUGGESTIONS = [
  'Como está o mês até agora?',
  'Quanto gastei com delivery esse mês?',
  'Quanto posso gastar por dia até o fim do mês?',
  'Como está a fatura do cartão?',
];
