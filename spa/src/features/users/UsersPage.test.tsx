import { afterEach, describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CurrentUserContext } from "@/features/auth/CurrentUser";
import { admin } from "@/features/auth/testing";
import fr from "@/shared/i18n/translations/fr.json";
import {
  createDom,
  domQueries,
  setValue,
  type TestDom,
} from "@/shared/test/dom";
import { json } from "@/shared/test/mockFetch";
import {
  renderTranslated,
  restoreBrowserGlobalsAfterEach,
  setBrowserLocation,
  setLightTheme,
} from "@/shared/test/render";
import { AdminToastProvider } from "@/shared/ui/AdminToast";
import { StatusTabs } from "@/shared/ui/StatusTabs";
import type { ManagedUser } from "./types";
import { UsersGrid } from "./UsersGrid";
import { UsersPage } from "./UsersPage";

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});
const { element, button, click, submit } = domQueries(() => dom);

restoreBrowserGlobalsAfterEach("window", "document", "localStorage");

describe("user status tabs", () => {
  it.each([
    ["all", true],
    ["active", false],
    ["inactive", false],
  ] as const)(
    "shows the status column only on the all tab (%s)",
    (status, visible) => {
      const user: ManagedUser = {
        id: 1,
        email: "user@example.test",
        firstname: "Ada",
        lastname: "Martin",
        role: "Subadmin",
        isActive: status !== "inactive",
        mustChangePassword: false,
        lastLoginAtEpochMs: null,
        createdAtEpochMs: 1,
        updatedAtEpochMs: 1,
      };
      const html = renderTranslated(
        <UsersGrid
          users={[user]}
          loading={false}
          status={status}
          onCreate={() => {}}
          onToggleUserActive={() => {}}
          updatingUserId={null}
          page={1}
          pageSize={10}
          hasNextPage={false}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
        />,
      );
      expect(html.includes(`>${fr.usersStatus}</th>`)).toBe(visible);
      expect(html.includes(`>${fr.usersActive}</td>`)).toBe(visible);
      expect(html).toContain(
        status === "inactive" ? fr.usersReactivate : fr.usersDeactivate,
      );
    },
  );

  it("defaults to all even when the previous active filter was stored", () => {
    setBrowserLocation("/admin/users");
    setLightTheme();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) =>
          key === "adminUsersStatusFilter" ? "active" : null,
      },
    });
    const html = renderTranslated(
      <AdminToastProvider>
        <UsersPage />
      </AdminToastProvider>,
    );
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html).toMatch(/id="[^"]+-all"[^>]*aria-selected="true"/);
    expect(html).toContain('role="tabpanel"');
    expect(html).not.toContain(fr.usersActiveStatusFilter);
  });

  it("shows all status counts without confusing unavailable values with zero", () => {
    const html = renderToStaticMarkup(
      <StatusTabs
        id="users"
        panelId="users-panel"
        label="Statut des utilisateurs"
        selected="inactive"
        onSelect={() => {}}
        tabs={[
          { value: "all", label: "Tous", count: 15 },
          { value: "active", label: "Actifs", count: 0 },
          { value: "inactive", label: "Désactivés", count: null },
        ]}
      />,
    );
    expect(html).toContain("Tous (15)");
    expect(html).toContain("Actifs (0)");
    expect(html).toContain("Désactivés (—)");
    expect(html).toMatch(/id="users-inactive"[^>]*aria-selected="true"/);
    expect(html).toContain('aria-controls="users-panel"');
  });
});

describe("users page interactions", () => {
  it("creates a user and refreshes the list; changing status reloads it", async () => {
    const requests: { path: string; method: string; body?: unknown }[] = [];
    globalThis.fetch = (async (url, options) => {
      const path = new URL(String(url)).pathname + new URL(String(url)).search;
      const method = options?.method ?? "GET";
      requests.push({
        path,
        method,
        body: options?.body ? JSON.parse(String(options.body)) : undefined,
      });
      if (path === "/users/counts")
        return json({ all: 0, active: 0, inactive: 0 });
      if (path.startsWith("/users?")) return json([]);
      if (path === "/users" && method === "POST") return json({ id: 2 });
      return json({});
    }) as typeof fetch;
    dom = await createDom("/admin/users");
    await dom.render(
      <AdminToastProvider>
        <UsersPage />
      </AdminToastProvider>,
    );
    await click(button(fr.createUserButton));
    await setValue(element("#user-firstname"), "Ada");
    await setValue(element("#user-lastname"), "Martin");
    await setValue(element("#user-email"), "ada@example.test");
    await setValue(element("#user-password"), "password-12345");
    await setValue(element("#user-role"), "Admin");
    await submit("dialog form");
    expect(
      requests.find((r) => r.path === "/users" && r.method === "POST")?.body,
    ).toEqual({
      firstname: "Ada",
      lastname: "Martin",
      email: "ada@example.test",
      password: "password-12345",
      role: "Admin",
    });
    expect(dom.container.querySelector("dialog")).toBeNull();
    expect(dom.container.textContent).toContain(fr.usersCreated);
    expect(
      requests.filter((r) => r.path.startsWith("/users?")).length,
    ).toBeGreaterThanOrEqual(2);
    await click(element('[role="tab"]:nth-child(2)'));
    expect(requests.some((r) => r.path.includes("status=active"))).toBe(true);
  });

  it("prevents self-deactivation and updates another user before reloading", async () => {
    const user = {
      ...admin,
      id: 2,
      email: "other@example.test",
      isActive: true,
      createdAtEpochMs: 1,
      updatedAtEpochMs: 1,
    };
    const calls: string[] = [];
    globalThis.fetch = (async (url, options) => {
      const path = new URL(String(url)).pathname;
      calls.push(`${options?.method ?? "GET"} ${path}`);
      if (path === "/users/counts")
        return json({ all: 2, active: 2, inactive: 0 });
      if (path === "/users")
        return json([{ ...user, id: 1, email: admin.email }, user]);
      if (path === "/users/2/deactivate")
        return new Response(null, { status: 204 });
      return json({});
    }) as typeof fetch;
    dom = await createDom("/admin/users");
    await dom.render(
      <AdminToastProvider>
        <CurrentUserContext.Provider value={admin}>
          <UsersPage />
        </CurrentUserContext.Provider>
      </AdminToastProvider>,
    );
    const buttons = [...dom.container.querySelectorAll("button")].filter(
      (b) => b.textContent?.trim() === fr.usersDeactivate,
    );
    expect(buttons).toHaveLength(2);
    expect(buttons[0]?.disabled).toBe(true);
    await click(buttons[1] as unknown as HTMLElement);
    expect(calls).toContain("PATCH /users/2/deactivate");
    expect(calls.filter((call) => call === "GET /users")).toHaveLength(2);
    expect(dom.container.textContent).toContain(fr.usersDeactivated);
  });
});
