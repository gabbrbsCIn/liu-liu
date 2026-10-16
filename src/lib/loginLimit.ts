import type { Db } from "./db";

/**
 * Limits password guessing. Every attempt is counted *before* the password is checked, so a burst
 * of parallel requests can't slip through, and a correct password clears its IP's count.
 *
 * - Per IP: 5 attempts per 15 minutes.
 * - Overall: 40 attempts per hour, for guessing spread over many IPs. Devices already logged in
 *   keep working while this is blocked; only new logins wait.
 */
export const LIMITS = [
  { scope: "ip", max: 5, windowMs: 15 * 60_000 },
  { scope: "all", max: 40, windowMs: 60 * 60_000 },
] as const;

/** Client IP as Vercel reports it; anything else falls back to one shared bucket. */
export function clientIp(headers: Headers): string {
  const ip = headers.get("x-real-ip") ?? headers.get("x-forwarded-for")?.split(",")[0];
  return ip?.trim().slice(0, 64) || "unknown";
}

/** Counts one attempt in a window (a new window starts once the old one ends); returns the count and when it resets. */
async function bump(db: Db, key: string, windowMs: number, now: number) {
  const [r] = await db.query<{ attempts: number; window_start: string | number }>(
    `INSERT INTO login_attempts (key, attempts, window_start) VALUES ($1, 1, $2)
     ON CONFLICT (key) DO UPDATE SET
       attempts = CASE WHEN login_attempts.window_start + $3 <= $2 THEN 1 ELSE login_attempts.attempts + 1 END,
       window_start = CASE WHEN login_attempts.window_start + $3 <= $2 THEN $2 ELSE login_attempts.window_start END
     RETURNING attempts, window_start`,
    [key, now, windowMs],
  );
  return { attempts: r.attempts, resetAt: Number(r.window_start) + windowMs };
}

/** Registers an attempt. Returns how many minutes to wait when over a limit, or null to go ahead. */
export async function registerAttempt(db: Db, ip: string, now = Date.now()): Promise<number | null> {
  let wait = 0;
  for (const l of LIMITS) {
    const { attempts, resetAt } = await bump(db, l.scope === "ip" ? `ip:${ip}` : "all", l.windowMs, now);
    if (attempts > l.max) wait = Math.max(wait, resetAt - now);
  }
  return wait > 0 ? Math.max(1, Math.ceil(wait / 60_000)) : null;
}

/** After a correct password: this IP starts fresh. */
export async function clearAttempts(db: Db, ip: string) {
  await db.query("DELETE FROM login_attempts WHERE key = $1", [`ip:${ip}`]);
}
