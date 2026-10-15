import { NextResponse } from "next/server";
import { SESSION_COOKIE, safeEqual, sessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = await sessionToken();
  const pw = process.env.APP_PASSWORD ?? "";
  if (!expected || typeof password !== "string" || !safeEqual(password, pw)) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }
  // The mobile app keeps the token and sends it as `Authorization: Bearer`.
  const res = NextResponse.json({ ok: true, token: expected });
  res.cookies.set(SESSION_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  return res;
}
