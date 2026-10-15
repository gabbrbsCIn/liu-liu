import { categoryOptions } from "./actions";
import { addMonths, today, ymOf, type Ym } from "./dates";
import { byGroup, totals } from "./finance";
import { headline, notes } from "./insights";
import { accounts, expectedIncome, hasData, installmentsView, lastSync, overview, txsBetween, txsOfMonth } from "./queries";
import type { TxFilter } from "./txFilter";

// Data each screen needs, in one place, so the web pages and the mobile app's JSON API show the same numbers.

export const userName = (): string => process.env.USER_NAME ?? "Gabriel";
export const initials = () => userName().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();

export type TxView = {
  id: string;
  date: string;
  description: string;
  amount: number;
  direction: "in" | "out";
  group_key: string;
  sub_label: string;
  excluded: boolean;
  hidden: boolean;
  note: string | null;
  edited: boolean;
  original_description: string;
  original_amount: number;
  original_date: string;
  source: string;
  installment: string | null;
  account: { id: string; name: string; color: string | null; type: string };
};

export type AccountOption = { id: string; name: string; label: string; color: string | null };

export async function transactionsView(filter: TxFilter) {
  const [txs, accs, options] = await Promise.all([txsBetween(filter.from, filter.to), accounts(), categoryOptions()]);
  const byId = new Map(accs.map((a) => [a.id, a]));
  const view: TxView[] = txs.map((t) => {
    const a = byId.get(t.account_id);
    return {
      id: t.id, date: t.date, description: t.description, amount: t.amount, direction: t.direction, group_key: t.group_key, sub_label: t.sub_label,
      excluded: t.excluded, hidden: !!t.hidden, note: t.note ?? null, edited: !!t.edited,
      original_description: t.original_description ?? t.description, original_amount: t.original_amount ?? t.amount, original_date: t.original_date ?? t.date,
      source: t.source, installment: t.total_installments && t.total_installments > 1 ? `${t.installment_number}/${t.total_installments}` : null,
      account: { id: t.account_id, name: a?.institution ?? a?.name ?? "Dinheiro", color: a?.color ?? null, type: a?.type ?? "MANUAL" },
    };
  });
  const accountOptions: AccountOption[] = accs.map((a) => {
    const name = a.institution ?? a.name;
    const kind = a.type === "CREDIT" ? `cartão${a.number ? ` •••• ${a.number.slice(-4)}` : ""}` : a.type === "BANK" ? (a.subtype === "SAVINGS_ACCOUNT" ? "poupança" : "conta") : "";
    return { id: a.id, name, label: kind ? `${name} · ${kind}` : name, color: a.color };
  });
  return { txs: view, accounts: accountOptions, options };
}

/** Home screen: the month's overview plus the headline and notes written from it. */
export async function homeView(ym: Ym) {
  if (!(await hasData())) return { empty: true as const };
  const [o, txs, prevTxs] = await Promise.all([overview(ym), txsOfMonth(ym), txsOfMonth(addMonths(ym, -1))]);
  return { empty: false as const, ...o, headline: headline(o, userName().split(" ")[0]), notes: notes(o, txs, prevTxs) };
}

export async function categoriesView(ym: Ym) {
  const [txs, prev] = await Promise.all([txsOfMonth(ym), txsOfMonth(addMonths(ym, -1))]);
  return { ym, groups: byGroup(txs, prev), spent: totals(txs).spent };
}

export async function installmentsScreen() {
  const ym = ymOf(today());
  const [v, accs, income] = await Promise.all([installmentsView(ym), accounts(), expectedIncome(ym)]);
  return { ym, ...v, income, accounts: accs.map((a) => ({ id: a.id, name: a.institution ?? a.name, color: a.color })) };
}

export async function session() {
  return { name: userName(), initials: initials(), today: today(), lastSync: await lastSync(), hasData: await hasData() };
}
