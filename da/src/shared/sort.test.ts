import { describe, expect, it } from "bun:test";
import { sortFrenchStrings } from "./sort";

describe("French alphabetical sorting", () => {
  it("sorts strings with French collation without mutating the input", () => {
    const values = [
      "Zoé",
      "émile",
      "Élise",
      "Anne",
      "Eve",
      "livre 10",
      "Livre 2",
    ];

    expect(sortFrenchStrings(values)).toEqual([
      "Anne",
      "Élise",
      "émile",
      "Eve",
      "Livre 2",
      "livre 10",
      "Zoé",
    ]);
    expect(values).toEqual([
      "Zoé",
      "émile",
      "Élise",
      "Anne",
      "Eve",
      "livre 10",
      "Livre 2",
    ]);
  });
});
