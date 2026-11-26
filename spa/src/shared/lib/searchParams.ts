/** Plain `?key=value` search params instead of the router's JSON encoding. */
export function parseSearch(searchString: string): Record<string, unknown> {
  return Object.fromEntries(new URLSearchParams(searchString));
}

export function stringifySearch(search: Record<string, unknown>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(search)) {
    if (value !== undefined && value !== null && value !== "")
      params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
