import { NextResponse } from "next/server";
import { today, validYm, ymOf } from "@/lib/dates";
import { categoriesView } from "@/lib/views";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ym = validYm(new URL(req.url).searchParams.get("m")) ?? ymOf(today());
  return NextResponse.json({ today: today(), ...(await categoriesView(ym)) });
}
