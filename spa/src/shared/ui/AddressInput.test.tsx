import { afterEach, describe, expect, it } from "bun:test";
import { act, useState } from "react";
import {
  createDom,
  domQueries,
  interact,
  setValue,
  type TestDom,
} from "@/shared/test/dom";
import { json } from "@/shared/test/mockFetch";
import { AddressInput, formatAddressSuggestion } from "./AddressInput";

describe("formatAddressSuggestion", () => {
  const suggestion = {
    id: "address-1",
    label: "2 Rue Pas Ici",
    name: "2 Rue Pas Ici",
    postcode: "00000",
    city: "Ville",
  };

  it("uses the provider label for a single-line input", () => {
    expect(formatAddressSuggestion(suggestion, false)).toBe(suggestion.label);
  });

  it("formats a multiline address as street and locality", () => {
    expect(formatAddressSuggestion(suggestion, true)).toBe(
      "2 Rue Pas Ici\n00000 Ville",
    );
  });

  it("keeps the locality when the street name is missing", () => {
    expect(
      formatAddressSuggestion(
        { ...suggestion, name: "", postcode: "00000", city: "Ville" },
        true,
      ),
    ).toBe("00000 Ville");
  });
});

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});
const { element } = domQueries(() => dom);

describe("AddressInput interactions", () => {
  it("selects an address suggestion by keyboard without searching the selected value again", async () => {
    const originalSetTimeout = globalThis.setTimeout;
    let debounce: (() => void) | undefined;
    let searches = 0;
    globalThis.setTimeout = ((
      callback: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) => {
      if (delay === 800 && typeof callback === "function") {
        debounce = () => callback(...args);
        return 0 as unknown as ReturnType<typeof setTimeout>;
      }
      return originalSetTimeout(callback, delay, ...args);
    }) as typeof setTimeout;
    try {
      globalThis.fetch = (async () => {
        searches++;
        return json({
          features: [
            {
              properties: {
                id: "1",
                label: "2 Rue Pas Ici",
                name: "2 Rue Pas Ici",
                postcode: "00000",
                city: "Ville",
              },
            },
          ],
        });
      }) as unknown as typeof fetch;
      dom = await createDom();
      function Field() {
        const [value, setValue] = useState("");
        return (
          <AddressInput
            id="address"
            multiline
            value={value}
            onChange={setValue}
          />
        );
      }
      await dom.render(<Field />);
      await setValue(element("#address"), "2 Rue");
      expect(searches).toBe(0);
      expect(debounce).toBeDefined();
      await act(async () => debounce?.());
      expect(dom.container.querySelectorAll('[role="option"]')).toHaveLength(1);
      await interact(() =>
        element("#address").dispatchEvent(
          new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }),
        ),
      );
      expect(
        dom.container
          .querySelector('[role="option"]')
          ?.getAttribute("aria-selected"),
      ).toBe("true");
      await interact(() =>
        element("#address").dispatchEvent(
          new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
        ),
      );
      expect((element("#address") as HTMLTextAreaElement).value).toBe(
        "2 Rue Pas Ici\n00000 Ville",
      );
      expect(dom.container.querySelector('[role="listbox"]')).toBeNull();
      expect(searches).toBe(1);
    } finally {
      globalThis.setTimeout = originalSetTimeout;
    }
  });
});
