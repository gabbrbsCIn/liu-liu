import { NextResponse } from "next/server";
import { setBudget } from "@/lib/actions";
import { today, validYm, ymOf } from "@/lib/dates";
import { budgetsView } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Budget status of the month (`?m=YYYY-MM`, default this month). */
export async function GET(req: Request) {
  const ym = validYm(new URL(req.url).searchParams.get("m")) ?? ymOf(today());
  return NextResponse.json({ today: today(), ...(await budgetsView(ym)) });
}

/** Sets a budget: `{ group_key, sub_label?, amount }`. An empty or zero amount removes it. */
export async function PUT(req: Request) {
  const b = (await req.json().catch(() => ({}))) as { group_key?: string; sub_label?: string; amount?: number | null };
  const amount = b.amount == null || (b.amount as unknown) === "" ? null : Number(b.amount);
  try {
    return NextResponse.json(await setBudget(String(b.group_key ?? ""), amount, String(b.sub_label ?? "")));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
