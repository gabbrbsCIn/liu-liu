import { Budgets } from "@/components/Budgets";
import { MonthSwitch } from "@/components/MonthSwitch";
import { today, validYm, ymOf } from "@/lib/dates";
import { budgetsView } from "@/lib/queries";

export const metadata = { title: "Orçamentos · liu liu" };

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const ym = validYm((await searchParams).m) ?? ymOf(today());
  const v = await budgetsView(ym);
  return (
    <>
      <div className="screen-h">
        <MonthSwitch ym={ym} path="/orcamentos" />
        <span className="faint" style={{ fontSize: 12.5 }}>o orçamento vale para todo mês; o mês escolhido muda só o que foi gasto</span>
      </div>
      <Budgets key={ym} v={v} />
    </>
  );
}
