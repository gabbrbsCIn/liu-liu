export const SESSION_COOKIE = "ll_session";

/** Session token derived from the password, so changing APP_PASSWORD logs every device out. Works in Edge and Node. */
export async function sessionToken(): Promise<string | null> {
  const pw = process.env.APP_PASSWORD;
  if (!pw) return null;
  const data = new TextEncoder().encode(`${pw}:${process.env.SESSION_SECRET ?? ""}:liuliu`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Whether a request carries a valid session: the browser's cookie or the app's bearer token. */
export async function isLoggedIn(req: Request): Promise<boolean> {
  const expected = await sessionToken();
  if (!expected) return false;
  const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const cookie = req.headers.get("cookie")?.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`))?.[1];
  return safeEqual(bearer ?? cookie ?? "", expected);
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
