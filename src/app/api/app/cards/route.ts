import { NextResponse } from "next/server";
import { today } from "@/lib/dates";
import { cardsView } from "@/lib/queries";
import { userName } from "@/lib/views";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ today: today(), holder: userName().toUpperCase(), cards: await cardsView() });
}
