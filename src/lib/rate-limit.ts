import { NextResponse } from "next/server";

/**
 * Fixed-window in-memory rate limiter for API routes. Keyed by scope +
 * identifier (client IP and, where available, an account identifier such as
 * the submitted email or the authenticated user id). Single-instance only —
 * good enough to stop brute-force/credential-stuffing bursts; swap the store
 * for Redis if the app ever scales horizontally.
 */

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 10_000;

export type RateLimitDecision = {
  allowed: boolean;
  retryAfterSec: number;
};

function pruneBuckets(now: number) {
  if (buckets.size <= MAX_BUCKETS) {
    return;
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }

  // Hard cap memory even under identifier spraying (all buckets "live").
  let excess = buckets.size - MAX_BUCKETS;
  for (const key of buckets.keys()) {
    if (excess <= 0) {
      break;
    }
    buckets.delete(key);
    excess -= 1;
  }
}

export function checkRateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitDecision {
  const key = `${scope}:${identifier.trim().toLowerCase()}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    pruneBuckets(now);
    return { allowed: true, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}

export function resetRateLimitsForTests() {
  buckets.clear();
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function rateLimitedResponse(retryAfterSec: number) {
  return NextResponse.json(
    {
      error: "Too many requests — please try again later.",
      details: { retryAfterSec },
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSec) },
    },
  );
}

type RateLimitOptions = {
  limit: number;
  windowMs: number;
  /** Optional account identifier (email / user id) bucketed separately from the IP. */
  identifier?: string;
};

/**
 * Enforce a rate limit for a request. Returns a 429 response when the caller
 * is over the limit (IP bucket and, when provided, identifier bucket — the
 * stricter one wins), or null when the request may proceed.
 *
 * Note: client IP comes from proxy headers (`x-forwarded-for`), so it is only
 * trustworthy when deployed behind a proxy that overwrites them (Vercel et al).
 */
export function enforceRateLimit(
  request: Request,
  scope: string,
  options: RateLimitOptions,
): NextResponse | null {
  const decisions = [checkRateLimit(scope, `ip:${getClientIp(request)}`, options.limit, options.windowMs)];

  if (options.identifier) {
    decisions.push(checkRateLimit(scope, `id:${options.identifier}`, options.limit, options.windowMs));
  }

  const blocked = decisions.find((decision) => !decision.allowed);
  if (blocked) {
    return rateLimitedResponse(blocked.retryAfterSec);
  }

  return null;
}
