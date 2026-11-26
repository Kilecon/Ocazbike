import { loginRateLimitBlocksCounter } from "../../shared/observability/metrics";
import { TooManyAttemptsError } from "./errors";

export type RateLimitSubjectType = "account" | "ip";

interface AttemptWindow {
  failures: number;
  windowStartedAt: number;
  lockedUntil: number;
}

export interface LoginRateLimiterOptions {
  maxFailures?: number;
  windowMs?: number;
  lockMs?: number;
  now?: () => number;
  onBlock?: (subjectType: RateLimitSubjectType) => void;
}

// In-memory limiter keyed by email and by IP so one attacker cannot lock every account.
export class LoginRateLimiter {
  private readonly attempts = new Map<string, AttemptWindow>();
  private readonly maxFailures: number;
  private readonly windowMs: number;
  private readonly lockMs: number;
  private readonly now: () => number;
  private readonly onBlock: (subjectType: RateLimitSubjectType) => void;

  constructor(options: LoginRateLimiterOptions = {}) {
    this.maxFailures = options.maxFailures ?? 5;
    this.windowMs = options.windowMs ?? 15 * 60 * 1000;
    this.lockMs = options.lockMs ?? 15 * 60 * 1000;
    this.now = options.now ?? Date.now;
    this.onBlock =
      options.onBlock ??
      ((subjectType) =>
        loginRateLimitBlocksCounter.add(1, { subject_type: subjectType }));
  }

  assertAllowed(email: string, ip: string): void {
    const now = this.now();
    for (const { key } of this.keys(email, ip)) {
      const entry = this.attempts.get(key);
      if (entry && entry.lockedUntil > now) {
        throw new TooManyAttemptsError(
          Math.ceil((entry.lockedUntil - now) / 1000),
        );
      }
    }
  }

  recordFailure(email: string, ip: string): void {
    const now = this.now();
    for (const { key, subjectType } of this.keys(email, ip)) {
      const current = this.attempts.get(key);
      const entry =
        current && now - current.windowStartedAt < this.windowMs
          ? current
          : { failures: 0, windowStartedAt: now, lockedUntil: 0 };
      entry.failures += 1;
      if (entry.failures >= this.maxFailures) {
        entry.lockedUntil = now + this.lockMs;
        entry.failures = 0;
        entry.windowStartedAt = now;
        this.onBlock(subjectType);
      }
      this.attempts.set(key, entry);
    }
    this.prune(now);
  }

  recordSuccess(email: string): void {
    this.attempts.delete(`email:${email}`);
  }

  private keys(
    email: string,
    ip: string,
  ): { key: string; subjectType: RateLimitSubjectType }[] {
    return [
      { key: `email:${email}`, subjectType: "account" },
      { key: `ip:${ip}`, subjectType: "ip" },
    ];
  }

  private prune(now: number): void {
    if (this.attempts.size < 10_000) return;
    for (const [key, entry] of this.attempts) {
      if (
        entry.lockedUntil <= now &&
        now - entry.windowStartedAt >= this.windowMs
      ) {
        this.attempts.delete(key);
      }
    }
  }
}
