import { afterEach, describe, expect, it } from "bun:test";
import { useState } from "react";
import {
  createDom,
  domQueries,
  interact,
  type TestDom,
} from "@/shared/test/dom";
import { StatusTabs } from "./StatusTabs";

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});
const { element } = domQueries(() => dom);

describe("StatusTabs", () => {
  it("moves status tabs with keyboard, including wrapping and Home/End", async () => {
    dom = await createDom();
    function Tabs() {
      const [selected, setSelected] = useState("all");
      return (
        <StatusTabs
          id="s"
          panelId="p"
          label="Status"
          selected={selected}
          onSelect={setSelected}
          tabs={[
            { value: "all", label: "All", count: 2 },
            { value: "active", label: "Active", count: 1 },
            { value: "inactive", label: "Inactive", count: 1 },
          ]}
        />
      );
    }
    await dom.render(<Tabs />);
    for (const [from, key, to] of [
      ["all", "ArrowLeft", "inactive"],
      ["inactive", "Home", "all"],
      ["all", "End", "inactive"],
      ["inactive", "ArrowRight", "all"],
    ]) {
      await interact(() =>
        element(`#s-${from}`).dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        ),
      );
      expect(element(`#s-${to}`).getAttribute("aria-selected")).toBe("true");
      expect(dom.browser.document.activeElement?.id).toBe(`s-${to}`);
    }
  });
});
