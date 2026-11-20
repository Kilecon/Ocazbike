export function compareFrenchStrings(left: string, right: string): number {
  return left.localeCompare(right, "fr", {
    sensitivity: "base",
    numeric: true,
  });
}

export function sortFrenchStrings(values: readonly string[]): string[] {
  return [...values].sort(compareFrenchStrings);
}
