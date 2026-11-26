import { afterEach, describe, expect, it } from "bun:test";
import fr from "@/shared/i18n/translations/fr.json";
import { createDom, domQueries, type TestDom } from "@/shared/test/dom";
import { AdminToastProvider, useAdminToast } from "./AdminToast";

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});
const { element, button, click } = domQueries(() => dom);

describe("AdminToast", () => {
  it("dismisses individual error toasts and translates known API errors", async () => {
    const { ApiError } = await import("@/shared/api/http");
    function Trigger() {
      const { showErrorToast } = useAdminToast();
      return (
        <button
          type="button"
          onClick={() =>
            showErrorToast(
              new ApiError("duplicate", 400, "EMAIL_ALREADY_EXISTS"),
              "fallback",
            )
          }
        >
          Trigger
        </button>
      );
    }
    dom = await createDom();
    await dom.render(
      <AdminToastProvider>
        <Trigger />
      </AdminToastProvider>,
    );
    await click(button("Trigger"));
    expect(
      dom.container.querySelector('[role="alert"]')?.textContent,
    ).toContain(fr.EMAIL_ALREADY_EXISTS);
    await click(element(`button[aria-label="${fr.toastDismiss}"]`));
    expect(dom.container.querySelector('[role="alert"]')).toBeNull();
  });
});
