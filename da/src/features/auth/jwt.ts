import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { InvalidAuthTokenError } from "./errors";
import type { AccessTokenClaims, RefreshTokenClaims } from "./types";

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode<T>(value: string): T {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
}

function signContent(content: string, secret: string): string {
  return createHmac("sha256", secret).update(content).digest("base64url");
}

function isValidSubject(subject: string): boolean {
  const userId = Number(subject);
  return (
    Number.isSafeInteger(userId) && userId > 0 && String(userId) === subject
  );
}

export class JwtService {
  constructor(private readonly secret: string) {}

  signAccessToken(
    userId: number,
    expiresIn: number,
    now = Math.floor(Date.now() / 1000),
  ): string {
    const claims: AccessTokenClaims = {
      sub: String(userId),
      type: "access",
      exp: now + expiresIn,
    };

    return this.sign(claims);
  }

  signRefreshToken(
    userId: number,
    expiresIn: number,
    now = Math.floor(Date.now() / 1000),
  ): string {
    const claims: RefreshTokenClaims = {
      sub: String(userId),
      type: "refresh",
      jti: randomUUID(),
      exp: now + expiresIn,
    };

    return this.sign(claims);
  }

  verifyAccessToken(
    token: string,
    now = Math.floor(Date.now() / 1000),
  ): AccessTokenClaims {
    const claims = this.verify<AccessTokenClaims>(token, now);

    if (claims.type !== "access" || !isValidSubject(claims.sub)) {
      throw new InvalidAuthTokenError();
    }

    return claims;
  }

  verifyRefreshToken(
    token: string,
    now = Math.floor(Date.now() / 1000),
  ): RefreshTokenClaims {
    const claims = this.verify<RefreshTokenClaims>(token, now);

    if (
      claims.type !== "refresh" ||
      !isValidSubject(claims.sub) ||
      typeof claims.jti !== "string" ||
      claims.jti.length === 0
    ) {
      throw new InvalidAuthTokenError();
    }
    return claims;
  }

  private sign(claims: AccessTokenClaims | RefreshTokenClaims): string {
    const header = encode({ alg: "HS256", typ: "JWT" });
    const payload = encode(claims);
    const content = `${header}.${payload}`;
    return `${content}.${signContent(content, this.secret)}`;
  }

  private verify<T extends { exp: number }>(token: string, now: number): T {
    try {
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error("Invalid token");

      const [header, payload, signature] = parts;
      const decodedHeader = decode<{ alg: string; typ: string }>(header);
      if (decodedHeader.alg !== "HS256" || decodedHeader.typ !== "JWT")
        throw new Error("Invalid header");

      const expected = signContent(`${header}.${payload}`, this.secret);
      const actualBytes = Buffer.from(signature);
      const expectedBytes = Buffer.from(expected);
      if (
        actualBytes.length !== expectedBytes.length ||
        !timingSafeEqual(actualBytes, expectedBytes)
      ) {
        throw new Error("Invalid signature");
      }

      const claims = decode<T>(payload);
      if (!Number.isInteger(claims.exp) || claims.exp <= now)
        throw new Error("Expired token");
      return claims;
    } catch {
      throw new InvalidAuthTokenError();
    }
  }
}
