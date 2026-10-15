import { NextResponse } from "next/server";
import { today } from "@/lib/dates";
import { parseFilter } from "@/lib/txFilter";
import { transactionsView } from "@/lib/views";

export const dynamic = "force-dynamic";

/** Same query string as the Transações page (m, de/ate, cat, conta…); the period decides what is loaded. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const params: Record<string, string[]> = {};
  sp.forEach((v, k) => (params[k] = [...(params[k] ?? []), v]));
  const filter = parseFilter(params, today());
  return NextResponse.json({ today: today(), filter, ...(await transactionsView(filter)) });
}
