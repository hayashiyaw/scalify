import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkRateLimit,
  recordRateLimitAttempt,
  resetRateLimitStore,
} from "@/lib/auth/rate-limit";

describe("checkRateLimit", () => {
  afterEach(() => {
    resetRateLimitStore();
    vi.useRealTimers();
  });

  it("allows attempts under the limit", () => {
    const options = { maxAttempts: 3, windowMs: 60_000 };

    expect(checkRateLimit("user:a", options)).toEqual({ allowed: true });
    recordRateLimitAttempt("user:a", options);
    expect(checkRateLimit("user:a", options)).toEqual({ allowed: true });
    recordRateLimitAttempt("user:a", options);
    expect(checkRateLimit("user:a", options)).toEqual({ allowed: true });
  });

  it("blocks when max attempts are reached within the window", () => {
    const options = { maxAttempts: 2, windowMs: 60_000 };

    recordRateLimitAttempt("user:b", options);
    recordRateLimitAttempt("user:b", options);

    const result = checkRateLimit("user:b", options);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("expires attempts after the window", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-20T12:00:00Z"));

    const options = { maxAttempts: 1, windowMs: 1_000 };
    recordRateLimitAttempt("user:c", options);
    expect(checkRateLimit("user:c", options).allowed).toBe(false);

    vi.setSystemTime(new Date("2026-06-20T12:00:02Z"));
    expect(checkRateLimit("user:c", options)).toEqual({ allowed: true });
  });

  it("tracks keys independently", () => {
    const options = { maxAttempts: 1, windowMs: 60_000 };

    recordRateLimitAttempt("user:d", options);
    expect(checkRateLimit("user:d", options).allowed).toBe(false);
    expect(checkRateLimit("user:e", options)).toEqual({ allowed: true });
  });
});
