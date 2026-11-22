import { beforeEach, describe, expect, it } from "vitest";

import { checkRateLimit, resetRateLimitsForTests } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimitsForTests();
  });

  it("allows requests under the limit and blocks the excess", () => {
    const windowMs = 60_000;
    let decision = checkRateLimit("auth:login", "ip:1.2.3.4", 3, windowMs, 1_000);
    expect(decision.allowed).toBe(true);

    decision = checkRateLimit("auth:login", "ip:1.2.3.4", 3, windowMs, 2_000);
    expect(decision.allowed).toBe(true);

    decision = checkRateLimit("auth:login", "ip:1.2.3.4", 3, windowMs, 3_000);
    expect(decision.allowed).toBe(true);

    decision = checkRateLimit("auth:login", "ip:1.2.3.4", 3, windowMs, 4_000);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSec).toBeGreaterThan(0);
  });

  it("resets the counter after the window elapses", () => {
    const windowMs = 60_000;
    for (let i = 0; i < 3; i += 1) {
      checkRateLimit("auth:login", "ip:1.2.3.4", 3, windowMs, 1_000);
    }

    const blocked = checkRateLimit("auth:login", "ip:1.2.3.4", 3, windowMs, 5_000);
    expect(blocked.allowed).toBe(false);

    const afterWindow = checkRateLimit("auth:login", "ip:1.2.3.4", 3, windowMs, 1_000 + windowMs + 1);
    expect(afterWindow.allowed).toBe(true);
  });

  it("reports the remaining wait time when blocked", () => {
    const windowMs = 60_000;
    for (let i = 0; i < 2; i += 1) {
      checkRateLimit("auth:login", "ip:1.2.3.4", 2, windowMs, 1_000);
    }

    const decision = checkRateLimit("auth:login", "ip:1.2.3.4", 2, windowMs, 21_000);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSec).toBe(40); // window ends at 61_000
  });

  it("isolates scopes and identifiers", () => {
    const windowMs = 60_000;
    checkRateLimit("auth:login", "ip:1.1.1.1", 1, windowMs, 1_000);
    checkRateLimit("auth:login", "id:user@example.com", 1, windowMs, 1_000);

    // Same identifier, different scope → independent bucket.
    expect(checkRateLimit("auth:register", "ip:1.1.1.1", 1, windowMs, 1_000).allowed).toBe(true);
    // Same scope, different identifier → independent bucket.
    expect(checkRateLimit("auth:login", "ip:2.2.2.2", 1, windowMs, 1_000).allowed).toBe(true);

    // Original buckets are exhausted.
    expect(checkRateLimit("auth:login", "ip:1.1.1.1", 1, windowMs, 1_000).allowed).toBe(false);
    expect(checkRateLimit("auth:login", "id:user@example.com", 1, windowMs, 1_000).allowed).toBe(false);
  });

  it("normalizes identifier casing and whitespace", () => {
    const windowMs = 60_000;
    checkRateLimit("auth:login", "  User@Example.COM ", 1, windowMs, 1_000);
    expect(checkRateLimit("auth:login", "user@example.com", 1, windowMs, 1_000).allowed).toBe(false);
  });
});
