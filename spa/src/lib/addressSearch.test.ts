import { describe, expect, it } from "bun:test";
import {
  buildAddressSearchUrl,
  parseAddressSuggestions,
} from "./addressSearch";

describe("buildAddressSearchUrl", () => {
  it("skips queries shorter than 5 characters", () => {
    expect(buildAddressSearchUrl("  12 r \n")).toBeNull();
  });

  it("queries the address index with a 5-result limit and the typed postcode", () => {
    const url = new URL(
      buildAddressSearchUrl("12 rue de la Paix\n33320 Eysines") ?? "",
    );
    expect(url.origin + url.pathname).toBe(
      "https://data.geopf.fr/geocodage/search",
    );
    expect(url.searchParams.get("q")).toBe("12 rue de la Paix 33320 Eysines");
    expect(url.searchParams.get("index")).toBe("address");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("postcode")).toBe("33320");
  });

  it("omits the postcode filter when none is typed", () => {
    const url = new URL(buildAddressSearchUrl("rue de la Paix") ?? "");
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
              label: "12 Rue de la Paix 75002 Paris",
              name: "12 Rue de la Paix",
              postcode: "75002",
              city: "Paris",
            },
          },
          { properties: {} },
        ],
      }),
    ).toEqual([
      {
        id: "a",
        label: "12 Rue de la Paix 75002 Paris",
        name: "12 Rue de la Paix",
        postcode: "75002",
        city: "Paris",
      },
    ]);
  });
});
