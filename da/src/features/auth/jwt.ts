import { randomUUID } from "node:crypto";
import { jwt } from "@elysiajs/jwt";
import { InvalidAuthTokenError } from "./errors";
import type { AccessTokenClaims, RefreshTokenClaims } from "./types";

const ALGORITHM = "HS256";

function isValidSubject(subject: unknown): subject is string {
  if (typeof subject !== "string") return false;
  const userId = Number(subject);
  return (
    Number.isSafeInteger(userId) && userId > 0 && String(userId) === subject
  );
}

/**
 * Thin adapter over @elysiajs/jwt so services and guards can sign and verify
 * tokens outside of an Elysia handler context.
 */
export class JwtService {
  private readonly signer;

  constructor(secret: string) {
    this.signer = jwt({ name: "jwt", secret, alg: ALGORITHM }).decorator.jwt;
  }

  signAccessToken(
    userId: number,
    expiresIn: number,
    now = Math.floor(Date.now() / 1000),
  ): Promise<string> {
    return this.signer.sign({
      sub: String(userId),
      type: "access",
      exp: now + expiresIn,
    });
  }

  async signRefreshToken(
    userId: number,
    expiresIn: number,
    now = Math.floor(Date.now() / 1000),
  ): Promise<{ token: string; claims: RefreshTokenClaims }> {
    const claims: RefreshTokenClaims = {
      sub: String(userId),
      type: "refresh",
      jti: randomUUID(),
      exp: now + expiresIn,
    };
    return { token: await this.signer.sign({ ...claims }), claims };
  }

  async verifyAccessToken(
    token: string,
    now = Math.floor(Date.now() / 1000),
  ): Promise<AccessTokenClaims> {
    const claims = await this.verify(token, now);
    if (claims.type !== "access" || !isValidSubject(claims.sub)) {
      throw new InvalidAuthTokenError();
    }
    return { sub: claims.sub, type: "access", exp: claims.exp };
  }

  async verifyRefreshToken(
    token: string,
    now = Math.floor(Date.now() / 1000),
  ): Promise<RefreshTokenClaims> {
    const claims = await this.verify(token, now);
    if (
      claims.type !== "refresh" ||
      !isValidSubject(claims.sub) ||
      typeof claims.jti !== "string" ||
      claims.jti.length === 0
    ) {
      throw new InvalidAuthTokenError();
    }
    return {
      sub: claims.sub,
      type: "refresh",
      jti: claims.jti,
      exp: claims.exp,
    };
  }

  private async verify(token: string, now: number) {
    const claims = await this.signer.verify(token, {
      algorithms: [ALGORITHM],
      currentDate: new Date(now * 1000),
    });
    if (!claims || !Number.isInteger(claims.exp)) {
      throw new InvalidAuthTokenError();
    }
    return claims as typeof claims & { exp: number };
  }
}
