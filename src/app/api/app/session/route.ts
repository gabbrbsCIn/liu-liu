import { NextResponse } from "next/server";
import { pluggyConfigured } from "@/lib/pluggy";
import { session } from "@/lib/views";

export const dynamic = "force-dynamic";

/** Who is using the app and the state of the data; the mobile app's first call after login. */
export async function GET() {
  return NextResponse.json({ ...(await session()), pluggyConfigured: pluggyConfigured() });
}
