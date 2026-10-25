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
  it("signs and verifies access-token claims", () => {
    const token = jwt.signAccessToken(42, 60, 1000);
    expect(jwt.verifyAccessToken(token, 1000)).toEqual({
      sub: "42",
      type: "access",
      exp: 1060,
    });
  });

  it("signs refresh tokens with a unique session id", () => {
    const first = jwt.verifyRefreshToken(
      jwt.signRefreshToken(42, 60, 1000),
      1000,
    );
    const second = jwt.verifyRefreshToken(
      jwt.signRefreshToken(42, 60, 1000),
      1000,
    );
    expect(first).toMatchObject({ sub: "42", type: "refresh", exp: 1060 });
    expect(first.jti).toBeString();
    expect(first.jti.length).toBeGreaterThan(0);
    expect(second.jti).not.toBe(first.jti);
  });

  it("rejects expired tokens, including tokens expiring at the current second", () => {
    const token = jwt.signAccessToken(1, 10, 100);
    expect(() => jwt.verifyAccessToken(token, 110)).toThrow(
      InvalidAuthTokenError,
    );
  });

  it("rejects malformed tokens, unsupported headers, and changed signatures", () => {
    expect(() => jwt.verifyAccessToken("not.a.jwt")).toThrow(
      InvalidAuthTokenError,
    );
    expect(() =>
      jwt.verifyAccessToken(
        signedToken({ sub: "1", type: "access", exp: 200 }, { alg: "none" }),
        100,
      ),
    ).toThrow(InvalidAuthTokenError);
    const token = jwt.signAccessToken(1, 100, 100);
    const changed = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
    expect(() => jwt.verifyAccessToken(changed, 100)).toThrow(
      InvalidAuthTokenError,
    );
  });

  it("rejects wrong token types and invalid subjects", () => {
    expect(() =>
      jwt.verifyAccessToken(jwt.signRefreshToken(1, 100, 100), 100),
    ).toThrow(InvalidAuthTokenError);
    expect(() =>
      jwt.verifyRefreshToken(jwt.signAccessToken(1, 100, 100), 100),
    ).toThrow(InvalidAuthTokenError);
    for (const subject of ["0", "-1", "1.5", "01", "9007199254740992"]) {
      expect(() =>
        jwt.verifyAccessToken(
          signedToken({ sub: subject, type: "access", exp: 200 }),
          100,
        ),
      ).toThrow(InvalidAuthTokenError);
    }
  });

  it("rejects malformed refresh claims", () => {
    expect(() =>
      jwt.verifyRefreshToken(
        signedToken({ sub: "1", type: "refresh", jti: "", exp: 200 }),
        100,
      ),
    ).toThrow(InvalidAuthTokenError);
  });
});
