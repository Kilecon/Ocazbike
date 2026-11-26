import { afterEach, describe, expect, it } from "bun:test";
import { CurrentUserContext } from "@/features/auth/CurrentUser";
import fr from "@/shared/i18n/translations/fr.json";
import { createDom, interact } from "@/shared/test/dom";
import {
  renderTranslated,
  restoreBrowserGlobalsAfterEach,
  setBrowserLocation,
  setLightTheme,
} from "@/shared/test/render";
import { AdminToastProvider } from "@/shared/ui/AdminToast";
import { AdminSidebar, OperationStatusCounts } from "./AdminSidebar";

restoreBrowserGlobalsAfterEach("window", "document");

function renderSidebar(role: "Admin" | "Subadmin") {
  return renderTranslated(
    <CurrentUserContext.Provider
      value={{
        email: "admin@example.test",
        firstname: "Ada",
        lastname: "Martin",
        role,
        mustChangePassword: false,
        lastLoginAtEpochMs: null,
      }}
    >
      <AdminToastProvider>
        <AdminSidebar />
      </AdminToastProvider>
    </CurrentUserContext.Provider>,
  );
}

describe("sidebar operation counts", () => {
  let dom: Awaited<ReturnType<typeof createDom>> | undefined;
  afterEach(async () => {
    await dom?.cleanup();
    dom = undefined;
  });

  it.each(["repairs", "sales", "buybacks", "rentals"] as const)(
    "shows one total count and keeps filtered links available for %s",
    (path) => {
      setBrowserLocation(`/admin/${path}`, "?status=in_progress");
      const html = renderTranslated(
        <OperationStatusCounts
          section={path}
          counts={{ pending: 51, in_progress: 2, payment_pending: 0 }}
        />,
      );
      for (const status of ["pending", "in_progress", "payment_pending"]) {
        expect(html).toContain(`href="/admin/${path}?status=${status}"`);
      }
      expect(html).toContain("En attente");
      expect(html).toContain("En cours");
      expect(html).toContain("À payer");
      expect(html).toContain(">53<");
      expect(html).toContain("oz-badge-warning");
      expect(html).toContain("oz-badge-info");
      expect(html).toContain(">51<");
      expect(html).toContain(">2<");
      expect(html).toContain(">0<");
      expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    },
  );
  it("does not present unavailable counts as zero", () => {
    setBrowserLocation("/admin");
    const html = renderTranslated(
      <OperationStatusCounts section="repairs" counts={null} />,
    );
    expect(html.match(/>—</g)).toHaveLength(4);
    expect(html).not.toContain(">0<");
  });

  it("closes on an outside click or another count, but not inside the menu", async () => {
    const view = await createDom("/admin/repairs");
    dom = view;
    await view.render(
      <>
        <OperationStatusCounts section="repairs" counts={null} />
        <OperationStatusCounts section="sales" counts={null} />
        <button type="button">Outside</button>
      </>,
    );
    const [repairs, sales] = dom.container.querySelectorAll("details");
    const repairsSummary = repairs?.querySelector("summary");
    const salesSummary = sales?.querySelector("summary");
    const inside = repairs?.querySelector("ul");
    const outside = dom.container.querySelector("button");
    if (
      !repairs ||
      !sales ||
      !repairsSummary ||
      !salesSummary ||
      !inside ||
      !outside
    )
      throw new Error("Missing sidebar count controls");

    await interact(() => repairsSummary.click());
    expect(repairs.open).toBe(true);
    await interact(() =>
      inside.dispatchEvent(
        new view.browser.MouseEvent("click", { bubbles: true }),
      ),
    );
    expect(repairs.open).toBe(true);
    await interact(() => outside.click());
    expect(repairs.open).toBe(false);

    await interact(() => repairsSummary.click());
    await interact(() => salesSummary.click());
    expect(repairs.open).toBe(false);
    expect(sales.open).toBe(true);
    await interact(() => salesSummary.click());
    expect(sales.open).toBe(false);
  });
});

describe("sidebar selection", () => {
  it.each(["repairs", "clients", "users", "support", "settings"])(
    "highlights the whole row for %s",
    (path) => {
      setBrowserLocation(`/admin/${path}`);
      setLightTheme();
      const html = renderSidebar("Admin");
      expect(html).toMatch(
        new RegExp(
          `<li class="oz-sidebar-item [^"]*is-active"><a[^>]*href="/admin/${path}"[^>]*aria-current="page"`,
        ),
      );
    },
  );
});

describe("sidebar organization", () => {
  it("renders the brand name in uppercase", () => {
    setBrowserLocation("/admin/clients");
    setLightTheme();
    const html = renderSidebar("Admin");
    expect(html).toContain('aria-label="OCAZBIKE"');
    expect(html).toContain(">OCAZBIKE</span>");
  });

  it.each(["Admin", "Subadmin"] as const)(
    "keeps the correct order and permissions for %s",
    (role) => {
      setBrowserLocation("/admin/clients");
      setLightTheme();
      const html = renderSidebar(role);
      const view = html.indexOf('href="/admin/clients"');
      const heading = html.indexOf(fr.adminWorkspaces);
      const repairs = html.indexOf('href="/admin/repairs"');
      expect(view).toBeGreaterThan(-1);
      expect(heading).toBeGreaterThan(view);
      expect(repairs).toBeGreaterThan(heading);
      if (role === "Admin") {
        expect(html.indexOf('href="/admin/settings"')).toBeGreaterThan(repairs);
        expect(html.indexOf('href="/admin/users"')).toBeGreaterThan(
          html.indexOf('href="/admin/settings"'),
        );
      } else {
        expect(html).not.toContain('href="/admin/settings"');
        expect(html).not.toContain('href="/admin/users"');
      }
    },
  );
});
