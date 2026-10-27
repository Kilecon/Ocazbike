import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { clearSession, request } from "./api-client";

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
  clearSession();
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
