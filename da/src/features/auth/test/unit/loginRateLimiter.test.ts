import { describe, expect, it } from "bun:test";
import { TooManyAttemptsError } from "../../errors";
import { LoginRateLimiter } from "../../loginRateLimiter";

describe("LoginRateLimiter", () => {
  it("allows attempts until the configured failure threshold", () => {
    let now = 1_000;
    const limiter = new LoginRateLimiter({
      maxFailures: 2,
      windowMs: 10_000,
      lockMs: 5_000,
      now: () => now,
    });

    expect(() =>
      limiter.assertAllowed("a@example.com", "127.0.0.1"),
    ).not.toThrow();
    limiter.recordFailure("a@example.com", "127.0.0.1");
    expect(() =>
      limiter.assertAllowed("a@example.com", "127.0.0.1"),
    ).not.toThrow();
    limiter.recordFailure("a@example.com", "127.0.0.1");
    expect(() => limiter.assertAllowed("a@example.com", "127.0.0.1")).toThrow(
      TooManyAttemptsError,
    );

    now += 5_000;
    expect(() =>
      limiter.assertAllowed("a@example.com", "127.0.0.1"),
    ).not.toThrow();
  });

  it("limits by IP as well as by email", () => {
    const limiter = new LoginRateLimiter({
      maxFailures: 1,
      now: () => 10_000,
    });
    limiter.recordFailure("a@example.com", "127.0.0.1");
    expect(() => limiter.assertAllowed("b@example.com", "127.0.0.1")).toThrow(
      TooManyAttemptsError,
    );
    expect(() => limiter.assertAllowed("a@example.com", "127.0.0.2")).toThrow(
      TooManyAttemptsError,
    );
  });

  it("reports each new account and IP lock without reporting repeated blocked attempts", () => {
    const blocks: string[] = [];
    const limiter = new LoginRateLimiter({
      maxFailures: 1,
      onBlock: (subjectType) => blocks.push(subjectType),
      now: () => 10_000,
    });

    limiter.recordFailure("a@example.com", "127.0.0.1");
    expect(blocks).toEqual(["account", "ip"]);
    expect(() => limiter.assertAllowed("a@example.com", "127.0.0.1")).toThrow(
      TooManyAttemptsError,
    );
    expect(blocks).toEqual(["account", "ip"]);
  });

  it("reports the remaining lock duration rounded up to a second", () => {
    let now = 0;
    const limiter = new LoginRateLimiter({
      maxFailures: 1,
      lockMs: 1_501,
      now: () => now,
    });
    limiter.recordFailure("a@example.com", "127.0.0.1");
    now = 1;

    try {
      limiter.assertAllowed("a@example.com", "127.0.0.1");
      throw new Error("Expected the request to be rate limited");
    } catch (error) {
      expect(error).toBeInstanceOf(TooManyAttemptsError);
      expect((error as TooManyAttemptsError).retryAfterSeconds).toBe(2);
    }
  });

  it("starts a fresh failure window after the old window expires", () => {
    let now = 0;
    const limiter = new LoginRateLimiter({
      maxFailures: 2,
      windowMs: 100,
      lockMs: 500,
      now: () => now,
    });
    limiter.recordFailure("a@example.com", "127.0.0.1");
    now = 100;
    limiter.recordFailure("a@example.com", "127.0.0.1");
    expect(() =>
      limiter.assertAllowed("a@example.com", "127.0.0.1"),
    ).not.toThrow();
  });

  it("clears the email counter on success without clearing the IP counter", () => {
    const limiter = new LoginRateLimiter({
      maxFailures: 2,
      now: () => 1,
    });
    limiter.recordFailure("a@example.com", "127.0.0.1");
    limiter.recordSuccess("a@example.com");
    expect(() =>
      limiter.assertAllowed("a@example.com", "127.0.0.1"),
    ).not.toThrow();
    limiter.recordFailure("b@example.com", "127.0.0.1");
    expect(() => limiter.assertAllowed("b@example.com", "127.0.0.1")).toThrow(
      TooManyAttemptsError,
    );
  });
});
