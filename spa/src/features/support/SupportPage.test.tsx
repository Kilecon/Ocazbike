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
import { SupportPage } from "./SupportPage";
import type { SupportRequestDTO } from "./types";

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});
const { element, button, click, submit } = domQueries(() => dom);

describe("support page", () => {
  it("creates a support request and reports a failed notification", async () => {
    const requests: { path: string; method: string; body?: unknown }[] = [];
    globalThis.fetch = (async (url, options) => {
      const parsed = new URL(String(url));
      const method = options?.method ?? "GET";
      requests.push({
        path: parsed.pathname,
        method,
        body: options?.body ? JSON.parse(String(options.body)) : undefined,
      });
      if (parsed.pathname === "/support" && method === "POST")
        return json({ reference: "BUG-42", discordNotification: "failed" });
      if (parsed.pathname === "/support")
        return json({ requests: [], total: 0 });
      return json({});
    }) as typeof fetch;
    dom = await createDom("/admin/support");
    await dom.render(
      <AdminToastProvider>
        <SupportPage />
      </AdminToastProvider>,
    );
    await click(button(fr.supportNewRequest));
    await click(element('input[value="BUG"]'));
    await setValue(element("#support-title-input"), "Broken screen");
    await setValue(element("#support-description"), "Cannot open the page");
    await submit("dialog form");
    expect(
      requests.find((r) => r.path === "/support" && r.method === "POST")?.body,
    ).toEqual({
      type: "BUG",
      title: "Broken screen",
      description: "Cannot open the page",
    });
    expect(dom.container.querySelector("dialog")).toBeNull();
    expect(dom.container.textContent).not.toContain("BUG-42");
    expect(dom.container.textContent).toContain(fr.supportCreated);
    expect(dom.container.textContent).toContain(fr.supportDiscordFailed);
    expect(
      requests.filter((r) => r.path === "/support" && r.method === "GET"),
    ).toHaveLength(2);
  });

  it.each([null, new Date(2026, 10, 22, 12).toISOString()])(
    "updates the support notification send date after a retry (previous: %s)",
    async (previousSentAt) => {
      const request: SupportRequestDTO = {
        id: 1,
        reference: "SR-2026-11-24-001",
        type: "SR",
        title: "Demande",
        description: "Description",
        status: "pending",
        createdAt: new Date(2026, 10, 24, 12).toISOString(),
        discordNotificationStatus: "failed",
        discordNotifiedAt: previousSentAt,
        discordNotificationAttemptAt: null,
      };
      const calls: string[] = [];
      globalThis.fetch = (async (url, options) => {
        const path = new URL(String(url)).pathname;
        calls.push(`${options?.method ?? "GET"} ${path}`);
        if (path === "/support/1/notification")
          return json({
            ...request,
            discordNotificationStatus: "sent",
            discordNotifiedAt: new Date(2026, 10, 24, 12).toISOString(),
            discordNotification: "sent",
          });
        return json({ requests: [request], total: 1 });
      }) as typeof fetch;
      dom = await createDom("/admin/support");
      await dom.render(
        <AdminToastProvider>
          <SupportPage />
        </AdminToastProvider>,
      );
      expect(element("tbody tr td:last-child").textContent).toContain(
        previousSentAt
          ? fr.emailSentOn.replace("{{date}}", "22/11/2026")
          : fr.emailNotSent,
      );
      await click(button(fr.supportNotificationResend));
      expect(calls).toContain("POST /support/1/notification");
      expect(element("tbody tr td:last-child").textContent).toContain(
        fr.emailSentOn.replace("{{date}}", "24/11/2026"),
      );
      expect(element("tbody tr td:last-child").textContent).not.toContain(
        fr.emailNotSent,
      );
    },
  );

  it("filters support requests from the list menu", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (url) => {
      const parsed = new URL(String(url));
      calls.push(parsed.pathname + parsed.search);
      if (parsed.pathname === "/support")
        return json({ requests: [], total: 0 });
      return json({});
    }) as typeof fetch;
    dom = await createDom("/admin/support");
    await dom.render(
      <AdminToastProvider>
        <SupportPage />
      </AdminToastProvider>,
    );
    await click(element(`button[aria-label="${fr.supportFilterType}"]`));
    const option = [
      ...dom.browser.document.querySelectorAll('[role="menuitemradio"]'),
    ].find((item) => item.textContent?.trim() === fr.supportType_BUG);
    if (!option) throw new Error("Missing BUG filter");
    await click(option as unknown as HTMLElement);
    expect(
      calls.some(
        (call) => call.startsWith("/support?") && call.includes("type=BUG"),
      ),
    ).toBe(true);
    expect(dom.browser.document.querySelector('[role="menu"]')).toBeNull();

    await click(element(`button[aria-label="${fr.supportFilterStatus}"]`));
    const closed = [
      ...dom.browser.document.querySelectorAll('[role="menuitemradio"]'),
    ].find((item) => item.textContent?.trim() === fr.status_closed);
    if (!closed) throw new Error("Missing closed filter");
    await click(closed as unknown as HTMLElement);
    expect(calls.at(-1)).toContain("status=closed");
  });
});
