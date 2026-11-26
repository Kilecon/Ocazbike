import { afterEach, describe, expect, it } from "bun:test";
import fr from "@/shared/i18n/translations/fr.json";
import {
  createDom,
  domQueries,
  setValue,
  type TestDom,
} from "@/shared/test/dom";
import { json } from "@/shared/test/mockFetch";
import { AdminToastProvider } from "@/shared/ui/AdminToast";
import { InitialPasswordChangePage } from "./InitialPasswordChangePage";
import { LoginPage } from "./LoginPage";

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});
const { element, submit } = domQueries(() => dom);

describe("authentication pages", () => {
  it("reports invalid login credentials, focuses the password and clears the error on editing", async () => {
    const calls: unknown[] = [];
    globalThis.fetch = (async (_url, options) => {
      calls.push(JSON.parse(String(options?.body)));
      return json({ code: "UNAUTHORIZED" }, 401);
    }) as typeof fetch;
    dom = await createDom("/admin");
    await dom.render(<LoginPage initialError="old error" />);
    expect(dom.container.textContent).toContain("OCAZBIKE");
    expect(dom.container.querySelector("img")).not.toBeNull();
    await setValue(element("#login-email"), "ada@example.test");
    await setValue(element("#login-password"), "wrong");
    await submit();
    expect(calls).toEqual([{ email: "ada@example.test", password: "wrong" }]);
    expect(dom.container.textContent).toContain(fr.InvalidCreds);
    expect(dom.container.textContent).not.toContain("old error");
    expect(dom.browser.document.activeElement?.id).toBe("login-password");
    await setValue(element("#login-password"), "changed");
    expect(dom.container.textContent).not.toContain(fr.InvalidCreds);
  });

  it("validates password confirmation and handles server errors before completing", async () => {
    const calls: unknown[] = [];
    let fail = true;
    let completed = 0;
    globalThis.fetch = (async (_url, options) => {
      calls.push(JSON.parse(String(options?.body)));
      return fail
        ? json({ code: "INVALID_CURRENT_PASSWORD" }, 400)
        : new Response(null, { status: 204 });
    }) as typeof fetch;
    dom = await createDom();
    await dom.render(
      <AdminToastProvider>
        <InitialPasswordChangePage
          onComplete={async () => {
            completed++;
          }}
        />
      </AdminToastProvider>,
    );
    expect(dom.container.textContent).toContain("OCAZBIKE");
    expect(dom.container.querySelector("img")).not.toBeNull();
    await setValue(element("#current-password"), "old-password");
    await setValue(element("#new-password"), "new-password-123");
    await setValue(element("#confirm-password"), "different-password");
    await submit();
    expect(calls).toHaveLength(0);
    expect(dom.container.textContent).toContain(fr.passwordsDoNotMatch);
    expect(dom.browser.document.activeElement?.id).toBe("confirm-password");
    await setValue(element("#confirm-password"), "new-password-123");
    await submit();
    expect(dom.container.textContent).toContain(fr.INVALID_CURRENT_PASSWORD);
    expect(dom.browser.document.activeElement?.id).toBe("current-password");
    fail = false;
    await setValue(element("#current-password"), "correct-password");
    await submit();
    expect(calls[1]).toEqual({
      currentPassword: "correct-password",
      password: "new-password-123",
    });
    expect(completed).toBe(1);
    expect(dom.container.textContent).toContain(fr.passwordChangeSuccess);
  });
});
