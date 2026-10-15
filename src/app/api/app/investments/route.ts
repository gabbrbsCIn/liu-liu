import { NextResponse } from "next/server";
import { today } from "@/lib/dates";
import { investmentsView } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ today: today(), ...(await investmentsView()) });
}
