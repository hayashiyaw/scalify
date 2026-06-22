type RateLimitEntry = {
  timestamps: number[];
};

const store = new Map<string, RateLimitEntry>();

export type RateLimitOptions = {
  maxAttempts: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterMs?: number;
};

function pruneExpiredTimestamps(entry: RateLimitEntry, windowStart: number): void {
  entry.timestamps = entry.timestamps.filter((timestamp) => timestamp > windowStart);
}

function cleanupStore(windowMs: number): void {
  const windowStart = Date.now() - windowMs;
  for (const [key, entry] of store) {
    pruneExpiredTimestamps(entry, windowStart);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  cleanupStore(options.windowMs);

  const now = Date.now();
  const windowStart = now - options.windowMs;
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  pruneExpiredTimestamps(entry, windowStart);

  if (entry.timestamps.length >= options.maxAttempts) {
    const oldestInWindow = entry.timestamps[0] ?? now;
    return {
      allowed: false,
      retryAfterMs: Math.max(0, oldestInWindow + options.windowMs - now),
    };
  }

  return { allowed: true };
}

export function recordRateLimitAttempt(key: string, options: RateLimitOptions): void {
  const now = Date.now();
  const windowStart = now - options.windowMs;
  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  pruneExpiredTimestamps(entry, windowStart);
  entry.timestamps.push(now);
}

/** Clears in-memory rate limit state (for tests). */
export function resetRateLimitStore(): void {
  store.clear();
}
