import { describe, expect, it } from "vitest";
import { budgetAlert, budgetStatus, type BudgetRow } from "../src/lib/budgets";
import type { Tx } from "../src/lib/finance";

const tx = (date: string, amount: number, group_key: string, sub_label: string, p: Partial<Tx> = {}): Tx => ({
  id: `${date}${amount}${sub_label}`, account_id: "a", date, description: sub_label, amount, direction: "out", group_key, sub_label, excluded: false,
  installment_number: null, total_installments: null, purchase_date: null, source: "pluggy", ...p,
});

const sep = [tx("2026-09-02", 300, "alim", "Delivery"), tx("2026-09-05", 200, "alim", "Mercado"), tx("2026-09-06", 100, "lazer", "Streaming"),
  tx("2026-09-07", 999, "transfer", "Entre suas contas", { excluded: true }), tx("2026-09-08", 50, "alim", "Delivery", { direction: "in" })];
const history = [tx("2026-06-10", 900, "alim", "Delivery"), tx("2026-07-10", 600, "alim", "Delivery"), tx("2026-08-10", 300, "alim", "Delivery")];

describe("budgetStatus", () => {
  const rows: BudgetRow[] = [{ group_key: "alim", sub_label: "", amount: 1000 }, { group_key: "alim", sub_label: "Delivery", amount: 250 }];

  it("compares spending with the budget and the month's pace", () => {
    const v = budgetStatus("2026-09", sep, history, rows, 15);
    const alim = v.groups.find((g) => g.group_key === "alim")!;
    // In past months all of it was spent by the 10th, so by the 15th the usual pace is the whole budget.
    expect(alim).toMatchObject({ budget: 1000, spent: 500, remaining: 500, expected: 1000, status: "ok" });
    // 500 left over 16 days (15th to 30th).
    expect(alim.perDay).toBeCloseTo(31.25);
    const delivery = alim.subs.find((s) => s.sub_label === "Delivery")!;
    expect(delivery).toMatchObject({ budget: 250, spent: 300, status: "over", remaining: -50 });
    // Suggestion: average of the 3 previous months.
    expect(delivery.suggestion).toBe(600);
  });

  it("follows your usual pace: rent paid early is not 'ahead of pace'", () => {
    const rent = [tx("2026-06-05", 2000, "moradia", "Aluguel"), tx("2026-07-05", 2000, "moradia", "Aluguel"), tx("2026-08-05", 2000, "moradia", "Aluguel")];
    const v = budgetStatus("2026-09", [tx("2026-09-05", 2000, "moradia", "Aluguel")], rent, [{ group_key: "moradia", sub_label: "", amount: 2200 }], 6);
    expect(v.groups.find((g) => g.group_key === "moradia")!).toMatchObject({ expected: 2200, status: "ok" });
  });

  it("without history, the pace is a straight line over the month", () => {
    const v = budgetStatus("2026-09", sep, [], [{ group_key: "alim", sub_label: "", amount: 1000 }], 15);
    expect(v.groups.find((g) => g.group_key === "alim")!.expected).toBe(500);
  });

  it("flags spending ahead of the month's pace", () => {
    const v = budgetStatus("2026-09", sep, [], [{ group_key: "alim", sub_label: "", amount: 1000 }], 5);
    expect(v.groups.find((g) => g.group_key === "alim")!.status).toBe("pace");
  });

  it("ignores moves between accounts and money in", () => {
    const v = budgetStatus("2026-09", sep, [], [], 30);
    expect(v.groups.find((g) => g.group_key === "alim")!.spent).toBe(500);
  });

  it("totals group budgets, or subcategory budgets when a group has none", () => {
    const v = budgetStatus("2026-09", sep, [], [{ group_key: "alim", sub_label: "", amount: 1000 }, { group_key: "lazer", sub_label: "Streaming", amount: 80 }], null);
    expect(v.total).toMatchObject({ budget: 1080, spent: 600, expected: null, perDay: null });
  });

  it("a past month has no pace", () => {
    const v = budgetStatus("2026-09", sep, [], rows, null);
    expect(v.groups.find((g) => g.group_key === "alim")!).toMatchObject({ expected: null, status: "ok" });
  });

  it("alerts on the worst budget first", () => {
    const v = budgetStatus("2026-09", sep, history, rows, 15);
    expect(budgetAlert(v)).toMatchObject({ label: "Alimentação › Delivery", status: "over" });
  });
});

describe("setBudget", () => {
  it("saves, updates and removes group and subcategory budgets", async () => {
    process.env.PGLITE_DIR = "memory";
    const { setBudget } = await import("../src/lib/actions");
    const db = await (await import("../src/lib/db")).getDb();
    await setBudget("alim", 1000);
    await setBudget("alim", 300, "Delivery");
    await setBudget("alim", 1200);
    expect(await db.query("SELECT group_key, sub_label, amount FROM budgets ORDER BY sub_label")).toEqual([
      { group_key: "alim", sub_label: "", amount: 1200 },
      { group_key: "alim", sub_label: "Delivery", amount: 300 },
    ]);
    await setBudget("alim", null, "Delivery");
    expect(await db.query("SELECT sub_label FROM budgets")).toEqual([{ sub_label: "" }]);
    await expect(setBudget("nada", 10)).rejects.toThrow();
    await expect(setBudget("alim", -5)).rejects.toThrow();
  });
});
