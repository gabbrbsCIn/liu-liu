import { GROUPS, type GroupKey } from "./categories";
import { daysInMonth, ymOf, type Ym } from "./dates";
import { isSpend, type Tx } from "./finance";

/** A monthly limit for a whole group (sub_label "") or for one subcategory inside it. */
export type BudgetRow = { group_key: string; sub_label: string; amount: number };

export type BudgetStatus = "none" | "ok" | "pace" | "over";

export type BudgetLine = {
  key: string;
  label: string;
  budget: number | null;
  spent: number;
  /** Average of the last 3 full months, a starting point when there is no budget yet. */
  suggestion: number;
  /** How much of the budget you would usually have spent by today (current month only), from your own pace. */
  expected: number | null;
  remaining: number | null;
  /** How much a day is left until the end of the month (current month only). */
  perDay: number | null;
  status: BudgetStatus;
};

export type GroupBudget = BudgetLine & { group_key: GroupKey; subs: (BudgetLine & { sub_label: string })[] };

const r2 = (v: number) => Math.round(v * 100) / 100;
// A little slack before calling it "above pace": spending is lumpy, a single purchase shouldn't raise the flag.
const PACE_SLACK = 1.1;

function line(key: string, label: string, budget: number | null, spent: number, suggestion: number, pace: { frac: number; daysLeft: number } | null): BudgetLine {
  const b = budget && budget > 0 ? budget : null;
  const expected = b != null && pace ? r2(b * pace.frac) : null;
  const status: BudgetStatus = b == null ? "none" : spent > b ? "over" : expected != null && spent > expected * PACE_SLACK ? "pace" : "ok";
  return {
    key,
    label,
    budget: b,
    spent: r2(spent),
    suggestion: r2(suggestion),
    expected,
    remaining: b == null ? null : r2(b - spent),
    perDay: b != null && pace ? r2(Math.max(0, b - spent) / pace.daysLeft) : null,
    status,
  };
}

function spendBy(txs: Tx[], ym?: Ym, upToDay?: number) {
  const groups = new Map<string, number>(), subs = new Map<string, number>();
  for (const t of txs) {
    if (!isSpend(t) || (ym && ymOf(t.date) !== ym) || (upToDay && Number(t.date.slice(8, 10)) > upToDay)) continue;
    groups.set(t.group_key, (groups.get(t.group_key) ?? 0) + t.amount);
    subs.set(`${t.group_key}:${t.sub_label}`, (subs.get(`${t.group_key}:${t.sub_label}`) ?? 0) + t.amount);
  }
  return { groups, subs };
}

/**
 * Budget status of every group for a month.
 * @param txs the month's transactions
 * @param history the 3 full months before it, for the suggestions
 * @param day today's day of the month when `ym` is the current month, otherwise null (a past month)
 */
export function budgetStatus(ym: Ym, txs: Tx[], history: Tx[], rows: BudgetRow[], day: number | null) {
  const days = daysInMonth(ym);
  const now = spendBy(txs, ym);
  const past = spendBy(history);
  const pastSoFar = day ? spendBy(history, undefined, day) : null;
  // Where you usually are by this day: the share of each category's spending that, in the last months,
  // had happened by today. Rent paid on the 5th is "all spent" from the 5th on; without history, a straight line.
  const paceOf = (map: "groups" | "subs", key: string) => {
    if (!day || !pastSoFar) return null;
    const total = past[map].get(key) ?? 0;
    const frac = total > 0 ? (pastSoFar[map].get(key) ?? 0) / total : day / days;
    return { frac, daysLeft: days - day + 1 };
  };
  const avg = (v: number | undefined) => (v ?? 0) / 3;
  const budgetOf = (g: string, s = "") => rows.find((r) => r.group_key === g && r.sub_label === s)?.amount ?? null;

  const groups: GroupBudget[] = GROUPS.map((g) => {
    // Subcategories shown: the ones with a budget, plus any with spending this month.
    const labels = new Set<string>([
      ...rows.filter((r) => r.group_key === g.key && r.sub_label).map((r) => r.sub_label),
      ...[...now.subs.keys()].filter((k) => k.startsWith(`${g.key}:`)).map((k) => k.slice(g.key.length + 1)),
    ]);
    const subs = [...labels]
      .map((s) => ({ ...line(`${g.key}:${s}`, s, budgetOf(g.key, s), now.subs.get(`${g.key}:${s}`) ?? 0, avg(past.subs.get(`${g.key}:${s}`)), paceOf("subs", `${g.key}:${s}`)), sub_label: s }))
      .sort((a, b) => Number(b.budget != null) - Number(a.budget != null) || b.spent - a.spent);
    return { ...line(g.key, g.name, budgetOf(g.key), now.groups.get(g.key) ?? 0, avg(past.groups.get(g.key)), paceOf("groups", g.key)), group_key: g.key, subs };
  });

  // The month's total: a group's own budget, or the sum of its subcategory budgets when the group has none.
  let budget = 0, spent = 0, expected = 0;
  for (const g of groups) {
    const subBudget = g.subs.reduce((s, x) => s + (x.budget ?? 0), 0);
    if (g.budget != null) {
      budget += g.budget;
      spent += g.spent;
      expected += g.expected ?? 0;
    } else if (subBudget > 0) {
      budget += subBudget;
      for (const x of g.subs) if (x.budget != null) {
        spent += x.spent;
        expected += x.expected ?? 0;
      }
    }
  }
  // The total's pace is the sum of each budget's own pace.
  const total = line("total", "Total", budget || null, spent, 0, day && budget ? { frac: expected / budget, daysLeft: days - day + 1 } : null);
  return { ym, day, days, total, groups };
}

export type BudgetView = ReturnType<typeof budgetStatus>;

/** The budget most worth a heads-up: one that blew up first, then one ahead of pace. */
export function budgetAlert(v: BudgetView) {
  const lines = v.groups.flatMap((g) => [g, ...g.subs.map((s) => ({ ...s, label: `${g.label} › ${s.label}` }))]);
  const worst = (s: BudgetStatus) => lines.filter((l) => l.status === s).sort((a, b) => b.spent / b.budget! - a.spent / a.budget!)[0];
  return worst("over") ?? worst("pace") ?? null;
}
