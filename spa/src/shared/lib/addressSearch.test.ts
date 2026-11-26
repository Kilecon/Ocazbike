import { afterEach, describe, expect, it } from "bun:test";
import {
  buildAddressSearchUrl,
  parseAddressSuggestions,
  searchAddresses,
} from "./addressSearch";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("buildAddressSearchUrl", () => {
  it("skips queries shorter than 5 characters", () => {
    expect(buildAddressSearchUrl("  12 r \n")).toBeNull();
  });

  it("queries the address index with a 5-result limit and the typed postcode", () => {
    const url = new URL(
      buildAddressSearchUrl("2 Rue Pas Ici\n00000 Ville") ?? "",
    );
    expect(url.origin + url.pathname).toBe(
      "https://data.geopf.fr/geocodage/search",
    );
    expect(url.searchParams.get("q")).toBe("2 Rue Pas Ici 00000 Ville");
    expect(url.searchParams.get("index")).toBe("address");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("postcode")).toBe("00000");
  });

  it("omits the postcode filter when none is typed", () => {
    const url = new URL(buildAddressSearchUrl("Rue Pas Ici") ?? "");
    expect(url.searchParams.has("postcode")).toBe(false);
  });
});

describe("parseAddressSuggestions", () => {
  it("keeps labelled features and ignores invalid payloads", () => {
    expect(parseAddressSuggestions(null)).toEqual([]);
    expect(
      parseAddressSuggestions({
        features: [
          {
            properties: {
              id: "a",
              label: "2 Rue Pas Ici",
              name: "2 Rue Pas Ici",
              postcode: "00000",
              city: "Ville",
            },
          },
          { properties: {} },
        ],
      }),
    ).toEqual([
      {
        id: "a",
        label: "2 Rue Pas Ici",
        name: "2 Rue Pas Ici",
        postcode: "00000",
        city: "Ville",
      },
    ]);
  });

  it("uses the label as the identifier and name when optional fields are absent", () => {
    const label = "2 Rue Pas Ici";

    expect(
      parseAddressSuggestions({
        features: [{ properties: { label } }],
      }),
    ).toEqual([
      {
        id: label,
        label,
        name: label,
        postcode: "",
        city: "",
      },
    ]);
  });
});

describe("searchAddresses", () => {
  it("does not fetch when the normalized query is too short", async () => {
    let fetchCount = 0;
    globalThis.fetch = Object.assign(
      async () => {
        fetchCount += 1;
        return Response.json({});
      },
      { preconnect: originalFetch.preconnect },
    );

    await expect(searchAddresses("  12  ")).resolves.toEqual([]);
    expect(fetchCount).toBe(0);
  });

  it("passes the abort signal and limits successful results", async () => {
    const controller = new AbortController();
    const features = Array.from({ length: 6 }, (_, index) => ({
      properties: { label: `Address ${index}` },
    }));
    let requestUrl = "";
    let requestSignal: AbortSignal | null | undefined;
    globalThis.fetch = Object.assign(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        requestUrl = String(input);
        requestSignal = init?.signal;
        return Response.json({ features });
      },
      { preconnect: originalFetch.preconnect },
    );

    const results = await searchAddresses("Rue Pas Ici", controller.signal);

    expect(new URL(requestUrl).searchParams.get("q")).toBe("Rue Pas Ici");
    expect(requestSignal).toBe(controller.signal);
    expect(results).toHaveLength(5);
    expect(results[0]?.label).toBe("Address 0");
    expect(results.at(-1)?.label).toBe("Address 4");
  });

  it("returns no suggestions for an unsuccessful response", async () => {
    globalThis.fetch = Object.assign(
      async () => new Response(null, { status: 503 }),
      { preconnect: originalFetch.preconnect },
    );

    await expect(searchAddresses("Rue Pas Ici")).resolves.toEqual([]);
  });

  it("propagates network failures to the caller", async () => {
    globalThis.fetch = Object.assign(
      async () => {
        throw new Error("Network unavailable");
      },
      { preconnect: originalFetch.preconnect },
    );

    await expect(searchAddresses("Rue Pas Ici")).rejects.toThrow(
      "Network unavailable",
    );
  });
});
