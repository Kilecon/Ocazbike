import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ApiError, removeLegacyStoredTokens, request } from "./api-client";

const originalFetch = globalThis.fetch;
const originalLocalStorage = Object.getOwnPropertyDescriptor(
  globalThis,
  "localStorage",
);
const storageValues = new Map<string, string>();

beforeEach(() => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      get length() {
        return storageValues.size;
      },
      clear: () => storageValues.clear(),
      getItem: (key: string) => storageValues.get(key) ?? null,
      key: (index: number) => [...storageValues.keys()][index] ?? null,
      removeItem: (key: string) => storageValues.delete(key),
      setItem: (key: string, value: string) =>
        storageValues.set(key, String(value)),
    } satisfies Storage,
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  storageValues.clear();
  if (originalLocalStorage) {
    Object.defineProperty(globalThis, "localStorage", originalLocalStorage);
  } else {
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});

describe("API GET request deduplication", () => {
  it("shares concurrent requests and fetches again after they settle", async () => {
    let resolveResponse: (response: Response) => void = () => {};
    let fetchCount = 0;
    const pendingResponse = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });

    globalThis.fetch = Object.assign(
      async () => {
        fetchCount += 1;
        return fetchCount === 1 ? pendingResponse : Response.json({ ok: true });
      },
      { preconnect: originalFetch.preconnect },
    );

    const firstRequest = request<{ ok: boolean }>("/auth/me");
    const secondRequest = request<{ ok: boolean }>("/auth/me");

    expect(fetchCount).toBe(1);
    resolveResponse(Response.json({ ok: true }));
    await expect(Promise.all([firstRequest, secondRequest])).resolves.toEqual([
      { ok: true },
      { ok: true },
    ]);

    await request("/auth/me");
    expect(fetchCount).toBe(2);
  });
});

type FetchCall = { url: string; init: RequestInit };

function mockFetch(responses: Array<() => Response>): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = Object.assign(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      calls.push({ url: String(input), init });
      const next = responses.shift();
      if (!next) throw new Error("Unexpected fetch");
      return next();
    },
    { preconnect: originalFetch.preconnect },
  );
  return calls;
}

describe("cookie-based authentication", () => {
  it("sends cookies and the app id without any Authorization header", async () => {
    storageValues.set("accessToken", "legacy-token");
    const calls = mockFetch([() => Response.json({ ok: true })]);

    await request("/clients");

    expect(calls).toHaveLength(1);
    const { init } = calls[0] as FetchCall;
    const headers = new Headers(init.headers);
    expect(init.credentials).toBe("include");
    expect(headers.get("X-App-Id")).toBeTruthy();
    expect(headers.has("Authorization")).toBe(false);
  });

  it("refreshes once on 401 and retries the original request", async () => {
    const calls = mockFetch([
      () => new Response(null, { status: 401 }),
      () => Response.json({ expiresIn: 900, user: {} }),
      () => Response.json({ ok: true }),
    ]);

    await expect(request("/auth/me")).resolves.toEqual({ ok: true });
    expect(calls.map(({ url }) => new URL(url).pathname)).toEqual([
      "/auth/me",
      "/auth/refresh",
      "/auth/me",
    ]);
    expect(calls[1]?.init.method).toBe("POST");
    expect(calls[1]?.init.credentials).toBe("include");
  });

  it("surfaces the original 401 when the refresh fails", async () => {
    const calls = mockFetch([
      () => Response.json({ code: "UNAUTHORIZED" }, { status: 401 }),
      () => new Response(null, { status: 401 }),
    ]);

    const error = await request("/auth/me").catch((caught) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
    expect(calls).toHaveLength(2);
  });

  it("removes legacy stored tokens", () => {
    storageValues.set("accessToken", "legacy-token");
    storageValues.set("refreshToken", "legacy-refresh");
    storageValues.set("theme", "dark");

    removeLegacyStoredTokens();

    expect([...storageValues.keys()]).toEqual(["theme"]);
  });
});
