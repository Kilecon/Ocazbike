import { afterEach, describe, expect, it } from "bun:test";
import { act } from "react";
import { admin } from "@/features/auth/testing";
import { createBillingOperation } from "@/features/operations/testing";
import fr from "@/shared/i18n/translations/fr.json";
import { domQueries, setValue, type TestDom, waitFor } from "@/shared/test/dom";
import { json } from "@/shared/test/mockFetch";
import { renderApp } from "./testing";

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});
const { hasElement, element, button, click, submit } = domQueries(() => dom);

describe("app routing and session", () => {
  it("shows login for an expired session and rejects non-admin roles with logout", async () => {
    let forbidden = false;
    const calls: string[] = [];
    globalThis.fetch = (async (url) => {
      const path = new URL(String(url)).pathname;
      calls.push(path);
      if (path === "/auth/me")
        return forbidden ? json({ ...admin, role: "User" }) : json({}, 401);
      if (path === "/auth/refresh") return json({}, 401);
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    dom = await renderApp("/admin/users");
    await waitFor(() => hasElement("#login-email"));
    expect(dom.container.textContent).not.toContain(fr.FORBIDDEN);
    await dom.cleanup();
    forbidden = true;
    dom = await renderApp("/admin/users");
    await waitFor(() => hasElement("#login-email"));
    expect(dom.container.textContent).toContain(fr.FORBIDDEN);
    expect(calls).toContain("/auth/logout");
    expect(calls).not.toContain("/users/counts");
  });

  it("explains why a signed-in account without staff access stays on the login page", async () => {
    let signedIn = false;
    globalThis.fetch = (async (url, options) => {
      const path = new URL(String(url)).pathname;
      if (path === "/auth/login" && options?.method === "POST") {
        signedIn = true;
        return json({});
      }
      if (path === "/auth/me")
        return signedIn ? json({ ...admin, role: "User" }) : json({}, 401);
      if (path === "/auth/refresh") return json({}, 401);
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    dom = await renderApp("/admin/repairs");
    await waitFor(() => hasElement("#login-email"));
    await setValue(element("#login-email"), "user@example.test");
    await setValue(element("#login-password"), "secret-password");
    await submit();
    await waitFor(
      () => dom?.container.textContent?.includes(fr.FORBIDDEN) ?? false,
    );
    expect(hasElement("#login-email")).toBe(true);
  });

  it("keeps the list scroll position and history when a row dialog opens and closes", async () => {
    const operation = createBillingOperation({ id: 42 });
    const listItem = { ...operation, closedAt: null };
    globalThis.fetch = (async (url) => {
      const path = new URL(String(url)).pathname;
      if (path === "/auth/me") return json(admin);
      if (path === "/operations/42") return json(operation);
      if (path === "/operations")
        return json({ operations: [listItem], total: 1 });
      return json({});
    }) as typeof fetch;
    dom = await renderApp("/admin/repairs?status=pending");
    await waitFor(() => hasElement("tbody tr"));
    const view = dom;
    await act(async () => {
      view.browser.scrollTo(0, 500);
      view.browser.document.dispatchEvent(new view.browser.Event("scroll"));
      await new Promise((resolve) => setTimeout(resolve, 150));
    });
    const scrolls: unknown[] = [];
    globalThis.scrollTo = ((...args: unknown[]) => {
      scrolls.push(args);
    }) as typeof scrollTo;
    const historyLength = dom.browser.history.length;

    await click(element("tbody tr"));
    await waitFor(() => button(fr.closeRepair, false) !== null);
    expect(dom.browser.location.pathname).toBe("/admin/repairs/42");
    await click(button(fr.closeRepair));
    await waitFor(() => !hasElement("dialog"));

    expect(dom.browser.location.pathname).toBe("/admin/repairs");
    expect(dom.browser.location.search).toBe("?status=pending");
    expect(dom.browser.history).toHaveLength(historyLength + 1);
    expect(scrolls).not.toContainEqual([{ top: 0, left: 0 }]);
  });

  it("requires a password change before rendering admin pages", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url) => {
      const path = new URL(String(url)).pathname;
      calls.push(path);
      return json({ ...admin, mustChangePassword: true });
    }) as typeof fetch;
    dom = await renderApp("/admin/users");
    await waitFor(() => hasElement("#current-password"));
    expect(calls).toEqual(["/auth/me"]);
  });

  it("redirects subadmins away from admin-only routes to repairs", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url) => {
      const path = new URL(String(url)).pathname;
      calls.push(path);
      if (path === "/auth/me") return json({ ...admin, role: "Subadmin" });
      if (path === "/operations") return json({ operations: [], total: 0 });
      return json({});
    }) as typeof fetch;
    dom = await renderApp("/admin/settings/");
    await waitFor(() => hasElement("#operations-title"));
    expect(dom.browser.location.pathname).toBe("/admin/repairs");
    expect(calls).not.toContain("/store-information");
    expect(dom.container.querySelector('a[href="/admin/settings"]')).toBeNull();
  });

  it("opens an operation dialog from its URL and closes it back to the filtered list", async () => {
    const operation = createBillingOperation({ id: 42 });
    globalThis.fetch = (async (url) => {
      const path = new URL(String(url)).pathname;
      if (path === "/auth/me") return json(admin);
      if (path === "/operations/42") return json(operation);
      if (path === "/operations") return json({ operations: [], total: 0 });
      return json({});
    }) as typeof fetch;
    dom = await renderApp("/admin/repairs/42?status=pending");
    await waitFor(() => button(fr.closeRepair, false) !== null);
    expect(hasElement("dialog[open]")).toBe(true);
    await click(button(fr.closeRepair));
    await waitFor(() => !hasElement("dialog"));
    expect(dom.browser.location.pathname).toBe("/admin/repairs");
    expect(dom.browser.location.search).toBe("?status=pending");
  });

  it("redirects unknown admin URLs to repairs and shows 404 elsewhere", async () => {
    globalThis.fetch = (async (url) => {
      const path = new URL(String(url)).pathname;
      if (path === "/auth/me") return json(admin);
      if (path === "/operations") return json({ operations: [], total: 0 });
      return json({});
    }) as typeof fetch;
    dom = await renderApp("/admin/unknown/page");
    await waitFor(() => hasElement("#operations-title"));
    expect(dom.browser.location.pathname).toBe("/admin/repairs");
    await dom.cleanup();
    dom = await renderApp("/elsewhere");
    await waitFor(() => hasElement("#not-found-title"));
  });

  it("logs out without reloading the page", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url) => {
      const path = new URL(String(url)).pathname;
      calls.push(path);
      if (path === "/auth/me") return json(admin);
      if (path === "/operations") return json({ operations: [], total: 0 });
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    dom = await renderApp("/admin/repairs");
    await waitFor(() => hasElement("#operations-title"));
    await click(element(`button[aria-label="${fr.logout}"]`));
    await waitFor(() => hasElement("#login-email"));
    expect(calls).toContain("/auth/logout");
    expect(calls.filter((path) => path === "/auth/me")).toHaveLength(1);
  });
});
