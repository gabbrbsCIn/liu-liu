import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, safeEqual, sessionToken } from "@/lib/auth";

// Routes that authenticate on their own (webhook secret, cron secret) or are the login itself.
const OPEN = ["/login", "/api/login", "/api/health", "/api/pluggy/webhook", "/api/cron/"];
// The bank-connection page the mobile app opens in the system browser (no cookie there). It reads no data:
// it only runs the Pluggy widget with the connect token in its URL, which only a logged-in app can get.
const OPEN_EXACT = ["/conectar"];

// The app's web build calls the API from another origin. It authenticates with a bearer token, never the
// cookie (a "*" origin never carries credentials), so allowing any origin exposes nothing.
const CORS = { "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, content-type", "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS" };

export async function middleware(req: NextRequest) {
  const res = await guard(req);
  if (req.nextUrl.pathname.startsWith("/api/")) for (const [k, v] of Object.entries(CORS)) res.headers.set(k, v);
  return res;
}

async function guard(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (req.method === "OPTIONS" && pathname.startsWith("/api/")) return new NextResponse(null, { status: 204 });
  if (OPEN_EXACT.includes(pathname) || OPEN.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const expected = await sessionToken();
  if (!expected) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("Defina APP_PASSWORD nas variáveis de ambiente para usar o liu liu.", { status: 503 });
    }
    return NextResponse.next(); // local dev without a password
  }

  // The browser sends the cookie; the mobile app sends the same token as a bearer header.
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const got = bearer ?? req.cookies.get(SESSION_COOKIE)?.value ?? "";
  if (safeEqual(got, expected)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Faça login de novo." }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/|favicon|icon|apple-icon).*)"] };
