import { describe, expect, it } from "bun:test";
import { filterMenuPosition } from "./FilterMenu";

describe("filterMenuPosition", () => {
  it("keeps the overlay inside the viewport independently of the grid height", () => {
    expect(
      filterMenuPosition(
        { left: 100, bottom: 200 },
        { width: 800, height: 600 },
      ),
    ).toEqual({
      width: "11.875rem",
      left: "6.25rem",
      top: "13rem",
      maxHeight: "24rem",
    });
    expect(
      filterMenuPosition(
        { left: 790, bottom: 590 },
        { width: 800, height: 600 },
      ),
    ).toEqual({
      width: "11.875rem",
      left: "37.625rem",
      top: "30rem",
      maxHeight: "7rem",
    });
    expect(
      filterMenuPosition(
        { left: 180, bottom: 290 },
        { width: 200, height: 300 },
      ),
    ).toEqual({
      width: "11.5rem",
      left: "0.5rem",
      top: "11.25rem",
      maxHeight: "7rem",
    });
  });
  it("scales menu spacing and width with the root font size", () => {
    expect(
      filterMenuPosition(
        { left: 790, bottom: 590 },
        { width: 800, height: 600 },
        20,
      ),
    ).toEqual({
      width: "11.875rem",
      left: "27.625rem",
      top: "22.5rem",
      maxHeight: "7rem",
    });
  });
});
