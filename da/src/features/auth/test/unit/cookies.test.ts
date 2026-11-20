import { describe, expect, it } from "bun:test";
import {
  ACCESS_COOKIE_NAME,
  accessCookie,
  clearAuthCookies,
  REFRESH_COOKIE_NAME,
  readCookie,
  refreshCookie,
} from "../../cookies";

describe("auth cookie helpers", () => {
  it("sets the access cookie for the whole API with security attributes", () => {
    expect(accessCookie("abc", 900, true)).toBe(
      "access_token=abc; Path=/; Max-Age=900; HttpOnly; SameSite=Strict; Secure",
    );
    expect(ACCESS_COOKIE_NAME).toBe("access_token");
  });

  it("sets the refresh cookie with its path and security attributes", () => {
    const cookie = refreshCookie("token with+symbols", 3600, true);
    expect(cookie).toBe(
      "refresh_token=token%20with%2Bsymbols; Path=/auth; Max-Age=3600; HttpOnly; SameSite=Strict; Secure",
    );
    expect(REFRESH_COOKIE_NAME).toBe("refresh_token");
  });

  it("omits Secure when secure cookies are disabled and clears with zero age", () => {
    expect(refreshCookie("abc", 60, false)).not.toContain("; Secure");
    const cleared = clearAuthCookies(true);
    expect(cleared).toHaveLength(2);
    expect(cleared[0]).toStartWith("access_token=; Path=/; Max-Age=0");
    expect(cleared[1]).toStartWith("refresh_token=; Path=/auth; Max-Age=0");
    expect(cleared.every((cookie) => cookie.includes("Secure"))).toBe(true);
    expect(
      clearAuthCookies(false).some((cookie) => cookie.includes("Secure")),
    ).toBe(false);
  });

  it("reads the named cookie among other cookies and decodes its value", () => {
    const request = new Request("http://localhost", {
      headers: { Cookie: "other=1; refresh_token=encoded%20value; last=2" },
    });
    expect(readCookie(request, "refresh_token")).toBe("encoded value");
  });

  it("returns undefined when absent, empty, or malformed", () => {
    expect(readCookie(new Request("http://localhost"), "refresh_token")).toBe(
      undefined,
    );
    expect(
      readCookie(
        new Request("http://localhost", {
          headers: { Cookie: "refresh_token=" },
        }),
        "refresh_token",
      ),
    ).toBeUndefined();
    expect(
      readCookie(
        new Request("http://localhost", {
          headers: { Cookie: "refresh_token=%E0%A4%A" },
        }),
        "refresh_token",
      ),
    ).toBeUndefined();
  });

  it("does not confuse cookie names that share a prefix", () => {
    expect(
      readCookie(
        new Request("http://localhost", {
          headers: {
            Cookie: "refresh_token_backup=wrong; refresh_token=right",
          },
        }),
        "refresh_token",
      ),
    ).toBe("right");
  });
});
