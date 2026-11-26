import { describe, expect, it } from "bun:test";
import { amountForLine, discountForLine, summarizeLines } from "./billingLines";

const line = {
  id: 1,
  description: "Étrier Avant",
  quantity: "2",
  unitPrice: "30",
  vatRate: "5.5",
};

describe("billing line calculations", () => {
  it("computes the amount including VAT, or nothing for invalid input", () => {
    expect(amountForLine(line)).toBe("63.30");
    expect(amountForLine({ ...line, unitPrice: "abc" })).toBe("");
  });

  it("derives a negative discount line only for a positive discount", () => {
    expect(discountForLine({ ...line, discount: "10" }, "Remise")).toEqual({
      description: "Remise étrier Avant",
      quantity: "1",
      unitPrice: "-10.00",
      vatRate: "5.5",
      discount: "0",
      total: "-10.55",
    });
    expect(
      discountForLine({ ...line, discount: "0" }, "Remise"),
    ).toBeUndefined();
    expect(
      discountForLine({ ...line, description: "VTT", discount: "5" }, "Remise")
        ?.description,
    ).toBe("Remise VTT");
  });

  it("lists billing lines as quantity and description", () => {
    expect(
      summarizeLines([
        { description: "Pneu", quantity: "2.000" },
        { description: "Main d'œuvre", quantity: "1.5" },
      ]),
    ).toBe("2 Pneu, 1.5 Main d'œuvre");
    expect(summarizeLines([])).toBe("");
  });
});
