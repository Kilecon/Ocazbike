/** Plain `?key=value` search params instead of the router's JSON encoding. */
export function parseSearch(searchString: string): Record<string, unknown> {
  return Object.fromEntries(new URLSearchParams(searchString));
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      typeof value === "bigint"
    ) {
      if (value !== "") params.set(key, String(value));
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
