import { NextResponse } from "next/server";
import { today } from "@/lib/dates";
import { installmentsScreen } from "@/lib/views";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ today: today(), ...(await installmentsScreen()) });
}
