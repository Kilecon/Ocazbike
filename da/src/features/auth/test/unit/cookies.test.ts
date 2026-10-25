import { describe, expect, it } from "bun:test";
import {
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
  readCookie,
  refreshCookie,
} from "../../cookies";

describe("refresh cookie helpers", () => {
  it("sets the refresh cookie with its path and security attributes", () => {
    const cookie = refreshCookie("token with+symbols", 3600, true);
    expect(cookie).toBe(
      "refresh_token=token%20with%2Bsymbols; Path=/auth; Max-Age=3600; HttpOnly; SameSite=Strict; Secure",
    );
    expect(REFRESH_COOKIE_NAME).toBe("refresh_token");
  });

  it("omits Secure when secure cookies are disabled and clears with zero age", () => {
    expect(refreshCookie("abc", 60, false)).not.toContain("; Secure");
    expect(clearRefreshCookie(true)).toContain("Max-Age=0");
    expect(clearRefreshCookie(true)).toContain("Secure");
    expect(clearRefreshCookie(false)).not.toContain("Secure");
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
