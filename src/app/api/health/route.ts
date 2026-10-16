import { NextResponse } from "next/server";
import { isLoggedIn } from "@/lib/auth";
import { health } from "@/lib/health";

export const dynamic = "force-dynamic";

/**
 * Public: only whether the app is up. Logged in: which settings exist (yes/no, never values),
 * the database status and the Pluggy app fingerprint, for the error page and debugging.
 */
export async function GET(req: Request) {
  const h = await health();
  const body = (await isLoggedIn(req)) ? h : { ok: h.ok };
  return NextResponse.json(body, { status: h.ok ? 200 : 503 });
}
