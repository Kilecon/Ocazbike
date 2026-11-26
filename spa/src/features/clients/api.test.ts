import { afterEach, describe, expect, it } from "bun:test";
import { mockFetch } from "@/shared/test/mockFetch";
import { createClient, getClient, getClientsPage, updateClient } from "./api";
import type { ClientInputDTO } from "./types";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("clients API", () => {
  it("encodes client search options in the paginated request", async () => {
    const calls = mockFetch([
      Response.json({ clients: [], page: 2, limit: 10, total: 0 }),
      Response.json({ clients: [], page: 1, limit: 10, total: 0 }),
    ]);

    await getClientsPage({ page: 2, limit: 10, search: "Ada & Co" });
    await getClientsPage({ page: 1, limit: 10 });

    const firstUrl = new URL(calls[0]?.url ?? "");
    const secondUrl = new URL(calls[1]?.url ?? "");
    expect(firstUrl.pathname).toBe("/clients");
    expect(firstUrl.searchParams.get("page")).toBe("2");
    expect(firstUrl.searchParams.get("limit")).toBe("10");
    expect(firstUrl.searchParams.get("search")).toBe("Ada & Co");
    expect(secondUrl.searchParams.has("search")).toBe(false);
  });

  it("uses the expected resource paths and serializes client writes", async () => {
    const calls = mockFetch([
      Response.json({}),
      Response.json({}),
      Response.json({}),
    ]);
    const input: ClientInputDTO = {
      firstname: "Ada",
      lastname: "Lovelace",
      email: "ada@example.test",
      isProfessional: false,
    };

    await getClient(42);
    await createClient(input);
    await updateClient(42, input);

    expect(
      calls.map(({ url, init }) => [
        new URL(url).pathname,
        init.method,
        init.body,
      ]),
    ).toEqual([
      ["/clients/42", undefined, undefined],
      ["/clients", "POST", JSON.stringify(input)],
      ["/clients/42", "PUT", JSON.stringify(input)],
    ]);
  });
});
