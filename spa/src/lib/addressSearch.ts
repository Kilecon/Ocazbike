const ADDRESS_SEARCH_ENDPOINT = "https://data.geopf.fr/geocodage/search";
const POSTCODE_PATTERN = /\b\d{5}\b/;

export const ADDRESS_SEARCH_MIN_LENGTH = 5;
export const ADDRESS_SEARCH_LIMIT = 5;
export const ADDRESS_SEARCH_DEBOUNCE_MS = 800;

export interface AddressSuggestion {
  id: string;
  label: string;
  name: string;
  postcode: string;
  city: string;
}

interface GeocodingFeature {
  properties?: {
    id?: string;
    label?: string;
    name?: string;
    postcode?: string;
    city?: string;
  };
}

export function normalizeAddressQuery(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function buildAddressSearchUrl(text: string) {
  const query = normalizeAddressQuery(text);
  if (query.length < ADDRESS_SEARCH_MIN_LENGTH) return null;
  const url = new URL(ADDRESS_SEARCH_ENDPOINT);
  url.searchParams.set("q", query);
  url.searchParams.set("index", "address");
  url.searchParams.set("limit", String(ADDRESS_SEARCH_LIMIT));
  const postcode = query.match(POSTCODE_PATTERN)?.[0];
  if (postcode) url.searchParams.set("postcode", postcode);
  return url.toString();
}

export function parseAddressSuggestions(payload: unknown): AddressSuggestion[] {
  const features = (payload as { features?: GeocodingFeature[] } | null)
    ?.features;
  if (!Array.isArray(features)) return [];
  return features.flatMap(({ properties }) => {
    if (!properties?.label) return [];
    return [
      {
        id: properties.id ?? properties.label,
        label: properties.label,
        name: properties.name ?? properties.label,
        postcode: properties.postcode ?? "",
        city: properties.city ?? "",
      },
    ];
  });
}

export async function searchAddresses(text: string, signal?: AbortSignal) {
  const url = buildAddressSearchUrl(text);
  if (!url) return [];
  const response = await fetch(url, { signal });
  if (!response.ok) return [];
  return parseAddressSuggestions(await response.json()).slice(
    0,
    ADDRESS_SEARCH_LIMIT,
  );
}
