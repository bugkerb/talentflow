export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
  maxKeys?: number;
  now?: () => number;
};

type Bucket = { count: number; resetAt: number };

export const rateLimitPolicies = {
  auth: { limit: 5, windowMs: 5 * 60_000 },
  upload: { limit: 10, windowMs: 60_000 },
  ai: { limit: 10, windowMs: 60_000 },
  scheduling: { limit: 10, windowMs: 60_000 }
} as const;

const normalizePart = (value: string): string => value.trim().toLowerCase();

export const rateLimitKey = (scope: string, ...parts: string[]): string => [scope, ...parts].map(normalizePart).join(":");

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, Bucket>();
  private readonly now: () => number;
  private readonly maxKeys: number;

  constructor(private readonly options: RateLimitOptions) {
    if (!Number.isInteger(options.limit) || options.limit < 1) throw new Error("Rate-limit limit must be a positive integer");
    if (!Number.isFinite(options.windowMs) || options.windowMs < 1) throw new Error("Rate-limit window must be positive");
    this.now = options.now ?? Date.now;
    this.maxKeys = options.maxKeys ?? 10_000;
  }

  check(key: string): RateLimitDecision {
    const timestamp = this.now();
    this.removeExpired(timestamp);
    const current = this.buckets.get(key);
    const bucket = current && current.resetAt > timestamp
      ? current
      : { count: 0, resetAt: timestamp + this.options.windowMs };

    if (!current && this.buckets.size >= this.maxKeys) this.buckets.delete(this.buckets.keys().next().value as string);
    if (bucket.count >= this.options.limit) return this.decision(false, bucket, timestamp);

    const updated = { ...bucket, count: bucket.count + 1 };
    this.buckets.set(key, updated);
    return this.decision(true, updated, timestamp);
  }

  private decision(allowed: boolean, bucket: Bucket, timestamp: number): RateLimitDecision {
    return {
      allowed,
      remaining: Math.max(this.options.limit - bucket.count, 0),
      retryAfterSeconds: Math.max(Math.ceil((bucket.resetAt - timestamp) / 1_000), 0)
    };
  }

  private removeExpired(timestamp: number): void {
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= timestamp) this.buckets.delete(key);
  }
}
