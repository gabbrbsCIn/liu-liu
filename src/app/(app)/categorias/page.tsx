import { CategoryGroups } from "@/components/CategoryGroups";
import { Ruler } from "@/components/charts";
import { MonthSwitch } from "@/components/MonthSwitch";
import { addMonths, monthName, today, validYm, ymOf } from "@/lib/dates";
import { byGroup, totals } from "@/lib/finance";
import { BRL } from "@/lib/format";
import { budgetsView, txsOfMonth } from "@/lib/queries";

export const metadata = { title: "Categorias · liu liu" };

export default async function Categories({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const ym = validYm((await searchParams).m) ?? ymOf(today());
  const [txs, prev, bv] = await Promise.all([txsOfMonth(ym), txsOfMonth(addMonths(ym, -1)), budgetsView(ym)]);
  const budgets = Object.fromEntries(bv.groups.filter((g) => g.budget != null).map((g) => [g.group_key, g.budget!]));
  const groups = byGroup(txs, prev);
  const { spent } = totals(txs);
  return (
    <div className="bento">
      <article className="p s12">
        <div className="ph" style={{ alignItems: "flex-start", flexWrap: "wrap" }}>
          <div><div className="big" style={{ margin: 0, fontSize: 34 }}>{BRL(spent)}</div><div className="faint" style={{ fontSize: 12.5, marginTop: 2 }}>gasto em {monthName(ym)} de {ym.slice(0, 4)}</div></div>
          <MonthSwitch ym={ym} path="/categorias" />
        </div>
        {spent > 0 && <Ruler ym={ym} groups={groups} total={spent} />}
      </article>
      <article className="p s12 plist">
        <div className="ph" style={{ padding: "16px 20px 8px" }}><span className="lbl">Categorias</span><span style={{ display: "inline-flex", gap: 12, alignItems: "baseline", flexWrap: "wrap", justifyContent: "flex-end" }}><span className="faint" style={{ fontSize: 12 }}>toque para abrir · clique numa subcategoria para ver as transações</span><a className="more" href={`/orcamentos?m=${ym}`}>orçamentos ↗</a></span></div>
        <CategoryGroups ym={ym} budgets={budgets} groups={groups} total={spent || 1} />
      </article>
    </div>
  );
}
