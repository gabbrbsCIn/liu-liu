import { beforeAll, describe, expect, it } from "vitest";

process.env.PGLITE_DIR = "memory";

describe("login limit", () => {
  let db: Awaited<ReturnType<typeof import("../src/lib/db").getDb>>;
  let lim: typeof import("../src/lib/loginLimit");
  beforeAll(async () => {
    db = await (await import("../src/lib/db")).getDb();
    lim = await import("../src/lib/loginLimit");
  });

  it("lets 5 attempts per IP through, then asks to wait until the window ends", async () => {
    const t = 1_000_000_000;
    for (let i = 0; i < 5; i++) expect(await lim.registerAttempt(db, "1.1.1.1", t + i)).toBeNull();
    expect(await lim.registerAttempt(db, "1.1.1.1", t + 10)).toBe(15);
    // Another IP is not affected.
    expect(await lim.registerAttempt(db, "2.2.2.2", t + 10)).toBeNull();
    // The window ends: counting starts again.
    expect(await lim.registerAttempt(db, "1.1.1.1", t + 15 * 60_000)).toBeNull();
  });

  it("a correct password clears the IP", async () => {
    const t = 2_000_000_000;
    for (let i = 0; i < 5; i++) await lim.registerAttempt(db, "3.3.3.3", t);
    await lim.clearAttempts(db, "3.3.3.3");
    expect(await lim.registerAttempt(db, "3.3.3.3", t)).toBeNull();
  });

  it("caps attempts overall, across IPs", async () => {
    await db.query("DELETE FROM login_attempts");
    const t = 3_000_000_000;
    let blocked: number | null = null;
    for (let i = 0; i < 41; i++) blocked = await lim.registerAttempt(db, `10.0.0.${i}`, t);
    expect(blocked).toBe(60);
  });

  it("counts parallel attempts without losing any", async () => {
    await db.query("DELETE FROM login_attempts");
    const r = await Promise.all(Array.from({ length: 8 }, () => lim.registerAttempt(db, "4.4.4.4", 4_000_000_000)));
    expect(r.filter((x) => x === null)).toHaveLength(5);
  });

  it("reads the client IP from the proxy headers", () => {
    expect(lim.clientIp(new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
    expect(lim.clientIp(new Headers({ "x-real-ip": "8.8.8.8", "x-forwarded-for": "9.9.9.9" }))).toBe("8.8.8.8");
    expect(lim.clientIp(new Headers())).toBe("unknown");
  });
});
