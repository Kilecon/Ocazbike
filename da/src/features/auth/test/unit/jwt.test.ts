import { describe, expect, it } from "bun:test";
import { createHmac } from "node:crypto";
import { InvalidAuthTokenError } from "../../errors";
import { JwtService } from "../../jwt";

const secret = "jwt-unit-test-secret-with-at-least-32-characters";
const jwt = new JwtService(secret);

function signedToken(
  payload: Record<string, unknown>,
  header: Record<string, unknown> = { alg: "HS256", typ: "JWT" },
) {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const content = `${encode(header)}.${encode(payload)}`;
  const signature = createHmac("sha256", secret)
    .update(content)
    .digest("base64url");
  return `${content}.${signature}`;
}

describe("JwtService", () => {
  it("signs and verifies access-token claims", async () => {
    const token = await jwt.signAccessToken(42, 60, 1000);
    expect(await jwt.verifyAccessToken(token, 1000)).toEqual({
      sub: "42",
      type: "access",
      exp: 1060,
    });
  });

  it("signs refresh tokens with a unique session id", async () => {
    const issued = await jwt.signRefreshToken(42, 60, 1000);
    const first = await jwt.verifyRefreshToken(issued.token, 1000);
    expect(first).toEqual(issued.claims);
    const second = await jwt.verifyRefreshToken(
      (await jwt.signRefreshToken(42, 60, 1000)).token,
      1000,
    );
    expect(first).toMatchObject({ sub: "42", type: "refresh", exp: 1060 });
    expect(first.jti).toBeString();
    expect(first.jti.length).toBeGreaterThan(0);
    expect(second.jti).not.toBe(first.jti);
  });

  it("rejects expired tokens, including tokens expiring at the current second", async () => {
    const token = await jwt.signAccessToken(1, 10, 100);
    await expect(jwt.verifyAccessToken(token, 110)).rejects.toThrow(
      InvalidAuthTokenError,
    );
  });

  it("rejects malformed tokens, unsupported headers, and changed signatures", async () => {
    await expect(jwt.verifyAccessToken("not.a.jwt")).rejects.toThrow(
      InvalidAuthTokenError,
    );
    await expect(
      jwt.verifyAccessToken(
        signedToken({ sub: "1", type: "access", exp: 200 }, { alg: "none" }),
        100,
      ),
    ).rejects.toThrow(InvalidAuthTokenError);
    await expect(
      jwt.verifyAccessToken(
        signedToken({ sub: "1", type: "access", exp: 200 }, { alg: "HS512" }),
        100,
      ),
    ).rejects.toThrow(InvalidAuthTokenError);
    const token = await jwt.signAccessToken(1, 100, 100);
    const [header, payload, signature] = token.split(".");
    const changed = `${header}.${payload}.${signature.startsWith("A") ? "B" : "A"}${signature.slice(1)}`;
    await expect(jwt.verifyAccessToken(changed, 100)).rejects.toThrow(
      InvalidAuthTokenError,
    );
  });

  it("rejects wrong token types and invalid subjects", async () => {
    await expect(
      jwt.verifyAccessToken(
        (await jwt.signRefreshToken(1, 100, 100)).token,
        100,
      ),
    ).rejects.toThrow(InvalidAuthTokenError);
    await expect(
      jwt.verifyRefreshToken(await jwt.signAccessToken(1, 100, 100), 100),
    ).rejects.toThrow(InvalidAuthTokenError);
    for (const subject of ["0", "-1", "1.5", "01", "9007199254740992"]) {
      await expect(
        jwt.verifyAccessToken(
          signedToken({ sub: subject, type: "access", exp: 200 }),
          100,
        ),
      ).rejects.toThrow(InvalidAuthTokenError);
    }
  });

  it("accepts tokens signed by the previous in-house implementation", async () => {
    expect(
      await jwt.verifyAccessToken(
        signedToken({ sub: "7", type: "access", exp: 200 }),
        100,
      ),
    ).toEqual({ sub: "7", type: "access", exp: 200 });
  });

  it("rejects malformed refresh claims", async () => {
    await expect(
      jwt.verifyRefreshToken(
        signedToken({ sub: "1", type: "refresh", jti: "", exp: 200 }),
        100,
      ),
    ).rejects.toThrow(InvalidAuthTokenError);
  });
});
