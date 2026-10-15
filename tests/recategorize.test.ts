import { beforeAll, describe, expect, it } from "vitest";
import { categorize, ruleDirection } from "../src/lib/categorize";

process.env.PGLITE_DIR = "memory";

describe("rules know which way the money goes", () => {
  it("infers a direction for rules saved before directions existed", () => {
    expect(ruleDirection({ group_key: "entrada" })).toBe("in");
    expect(ruleDirection({ group_key: "alim" })).toBe("out");
    expect(ruleDirection({ group_key: "transfer" })).toBeNull();
    expect(ruleDirection({ group_key: "transfer", direction: "in" })).toBe("in");
  });
  it("only applies a rule in its own direction", () => {
    const rules = [
      { pattern: "pix gabriel", group_key: "transfer", sub_label: "Entre suas contas", direction: "out" },
      { pattern: "pix gabriel", group_key: "entrada", sub_label: "Reembolso", direction: "in" },
    ];
    expect(categorize({ description: "PIX GABRIEL", direction: "out" }, rules)).toMatchObject({ group: "transfer", excluded: true });
    expect(categorize({ description: "PIX GABRIEL", direction: "in" }, rules)).toMatchObject({ group: "entrada", sub: "Reembolso", excluded: false });
  });
  it("never turns money in into spending through an old spending rule", () => {
    const rules = [{ pattern: "mercado livre", group_key: "compras", sub_label: "Marketplace" }];
    expect(categorize({ description: "MERCADO LIVRE", direction: "in" }, rules).group).toBe("entrada");
  });
});

describe("recategorize", () => {
  let db: Awaited<ReturnType<typeof import("../src/lib/db").getDb>>;
  let actions: typeof import("../src/lib/actions");
  const insert = (id: string, description: string, direction: "in" | "out", group: string) =>
    db.query(
      "INSERT INTO transactions (id, account_id, date, description, amount, direction, group_key, sub_label, excluded, source) VALUES ($1,'acc','2026-10-01',$2,10,$3,$4,'x',$5,'pluggy')",
      [id, description, direction, group, group === "transfer"],
    );
  const row = async (id: string) => (await db.query<{ group_key: string; sub_label: string; excluded: boolean }>("SELECT group_key, sub_label, excluded FROM transactions WHERE id = $1", [id]))[0];

  beforeAll(async () => {
    db = await (await import("../src/lib/db")).getDb();
    actions = await import("../src/lib/actions");
    await insert("in1", "TRANSFERENCIA RECEBIDA MARIA", "in", "transfer");
    await insert("in2", "TRANSFERENCIA RECEBIDA MARIA", "in", "transfer");
    await insert("out1", "TRANSFERENCIA RECEBIDA MARIA", "out", "transfer");
    await insert("out2", "PAGAMENTO FATURA", "out", "transfer");
  });

  it("turns an incoming move between accounts into income, with the similar ones", async () => {
    const r = await actions.recategorize("in1", "entrada", "Reembolso", true);
    expect(r.updated).toBe(2);
    expect(await row("in1")).toMatchObject({ group_key: "entrada", sub_label: "Reembolso", excluded: false });
    expect(await row("in2")).toMatchObject({ group_key: "entrada", excluded: false });
    // The same description going out is left alone.
    expect(await row("out1")).toMatchObject({ group_key: "transfer", excluded: true });
  });

  it("turns an outgoing move into spending", async () => {
    await actions.recategorize("out2", "moradia", "Aluguel", false);
    expect(await row("out2")).toMatchObject({ group_key: "moradia", excluded: false });
  });

  it("refuses a category from the other direction", async () => {
    await expect(actions.recategorize("in1", "alim", "Delivery", false)).rejects.toThrow(/entrada/);
    await expect(actions.recategorize("out1", "entrada", "Salário", false)).rejects.toThrow(/saída/);
  });

  it("keeps one rule per description and direction", async () => {
    await actions.recategorize("out1", "outros", "Pix e transferências", true);
    const rules = await db.query<{ direction: string; group_key: string }>("SELECT direction, group_key FROM category_rules WHERE pattern = $1 ORDER BY direction", ["transferencia recebida maria"]);
    expect(rules).toEqual([{ direction: "in", group_key: "entrada" }, { direction: "out", group_key: "outros" }]);
  });

  it("offers income categories", async () => {
    const opts = await actions.categoryOptions();
    expect(opts.some((o) => o.group_key === "entrada" && o.label === "Salário")).toBe(true);
  });
});
