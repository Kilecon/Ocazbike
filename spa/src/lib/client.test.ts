import { describe, expect, it } from "bun:test";
import { formatClientName } from "./client";

describe("client display name", () => {
  it.each([
    ["martin", "aDA", "MARTIN Ada"],
    [" dupont ", " jEAN-pIERRE ", "DUPONT Jean-Pierre"],
    ["durand", "éLODIE aNNE", "DURAND Élodie Anne"],
    ["o'neill", "mARY-jANE", "O'NEILL Mary-Jane"],
  ])("formats %s / %s", (lastname, firstname, expected) => {
    expect(formatClientName(lastname, firstname)).toBe(expected);
  });
});
