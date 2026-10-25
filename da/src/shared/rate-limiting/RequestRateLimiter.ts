export class RateLimitExceededError extends Error {
  readonly statusCode = 429;
  readonly code = "TOO_MANY_REQUESTS";

  constructor(readonly retryAfterSeconds: number) {
    super("Too many requests, try again later");
    this.name = "RateLimitExceededError";
  }
}

interface RequestWindow {
  requests: number;
  windowStartedAt: number;
}

export interface RequestRateLimiterOptions {
  maxRequests?: number;
  windowMs?: number;
  now?: () => number;
}

export class RequestRateLimiter {
  private readonly requestsByClient = new Map<string, RequestWindow>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly now: () => number;

  constructor(options: RequestRateLimiterOptions = {}) {
    this.maxRequests = options.maxRequests ?? 300;
    this.windowMs = options.windowMs ?? 15 * 60 * 1000;
    this.now = options.now ?? Date.now;

    if (!Number.isInteger(this.maxRequests) || this.maxRequests < 1) {
      throw new Error("maxRequests must be a positive integer");
    }
    if (!Number.isFinite(this.windowMs) || this.windowMs < 1) {
      throw new Error("windowMs must be a positive number");
    }
  }

  assertAllowed(clientId: string): void {
    const now = this.now();
    const current = this.requestsByClient.get(clientId);
    const window =
      current && now - current.windowStartedAt < this.windowMs
        ? current
        : { requests: 0, windowStartedAt: now };

    if (window.requests >= this.maxRequests) {
      throw new RateLimitExceededError(
        Math.max(
          1,
          Math.ceil((window.windowStartedAt + this.windowMs - now) / 1000),
        ),
      );
    }

    window.requests += 1;
    this.requestsByClient.set(clientId, window);
    this.prune(now);
  }

  private prune(now: number): void {
    if (this.requestsByClient.size < 10_000) return;
    for (const [clientId, window] of this.requestsByClient) {
      if (now - window.windowStartedAt >= this.windowMs) {
        this.requestsByClient.delete(clientId);
      }
    }
  }
}
