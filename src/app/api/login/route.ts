import { NextResponse } from "next/server";
import { SESSION_COOKIE, safeEqual, sessionToken } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { clearAttempts, clientIp, registerAttempt } from "@/lib/loginLimit";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const expected = await sessionToken();
  const pw = process.env.APP_PASSWORD ?? "";
  const ip = clientIp(req.headers);
  const db = await getDb();

  const wait = await registerAttempt(db, ip);
  if (wait) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente de novo em ${wait} ${wait === 1 ? "minuto" : "minutos"}.` },
      { status: 429, headers: { "retry-after": String(wait * 60) } },
    );
  }

  if (!expected || typeof password !== "string" || !safeEqual(password, pw)) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
  }
  await clearAttempts(db, ip);
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
