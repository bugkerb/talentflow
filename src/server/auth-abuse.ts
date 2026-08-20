import { InMemoryRateLimiter, rateLimitKey, rateLimitPolicies, type RateLimitDecision, type RateLimitOptions } from "./rate-limit";

type AuthRateLimiterOptions = Omit<RateLimitOptions, "maxKeys"> & { maxKeys?: number };

export type AuthRateLimitDecision = RateLimitDecision;

export const createAuthRateLimiter = (options: AuthRateLimiterOptions = rateLimitPolicies.auth) => {
  const byAccount = new InMemoryRateLimiter(options);
  const byAddress = new InMemoryRateLimiter(options);

  return {
    check(email: string, address: string): AuthRateLimitDecision {
      const account = byAccount.check(rateLimitKey("auth-account", email));
      const client = byAddress.check(rateLimitKey("auth-address", address));
      return {
        allowed: account.allowed && client.allowed,
        remaining: Math.min(account.remaining, client.remaining),
        retryAfterSeconds: Math.max(account.retryAfterSeconds, client.retryAfterSeconds)
      };
    }
  };
};

export const clientAddressFromHeaders = (headers: Headers): string => {
  const forwarded = headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const direct = headers.get("x-real-ip")?.trim();
  return (forwarded || direct || "unknown").slice(0, 128);
};
