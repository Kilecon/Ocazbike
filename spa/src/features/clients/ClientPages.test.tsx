import { afterEach, describe, expect, it } from "bun:test";
import { CurrentUserContext } from "@/features/auth/CurrentUser";
import { admin } from "@/features/auth/testing";
import fr from "@/shared/i18n/translations/fr.json";
import {
  createDom,
  domQueries,
  setValue,
  type TestDom,
  waitFor,
} from "@/shared/test/dom";
import { json } from "@/shared/test/mockFetch";
import { AdminToastProvider } from "@/shared/ui/AdminToast";
import { Client360Page } from "./Client360Page";
import { ClientDetailPage } from "./ClientDetailPage";

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});
const { hasElement, element, button, click, submit } = domQueries(() => dom);

describe("client pages", () => {
  it("loads the client directory and displays professional business details", async () => {
    const requests: string[] = [];
    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      requests.push(`${url.pathname}${url.search}`);
      return json({
        clients: [
          {
            id: 5,
            firstname: "Ada",
            lastname: "Lovelace",
            email: "ada@example.test",
            phonenumber: "06 00 00 00 00",
            address: null,
            addressComplement: null,
            isProfessional: true,
            companyName: "Cycle Co",
            siret: "12345678900012",
          },
        ],
        page: 1,
        limit: 10,
        total: 1,
      });
    }) as typeof fetch;
    dom = await createDom("/admin/clients");
    await dom.render(
      <AdminToastProvider>
        <Client360Page />
      </AdminToastProvider>,
    );
    await waitFor(() => hasElement('a[href="/admin/clients/5"]'));

    expect(
      requests.filter((request) => request.startsWith("/clients")),
    ).toEqual(["/clients?page=1&limit=10"]);
    expect(
      dom.container.querySelector('a[href="/admin/clients/5"]')?.textContent,
    ).toContain("LOVELACE Ada");
    expect(dom.container.textContent).toContain("Cycle Co");
  });

  it("discards client edits on cancel and persists normalized changes on save", async () => {
    const client = {
      id: 5,
      firstname: "Ada",
      lastname: "Martin",
      email: "ada@example.test",
      phonenumber: "",
      address: "",
      addressComplement: "",
      identityCardNumber: null,
      privatenote: "",
      isProfessional: false,
      siret: null,
      companyName: null,
      createdAtMs: 1,
      lastModificationMs: 1,
    };
    let saved: Record<string, unknown> | undefined;
    globalThis.fetch = (async (url, options) => {
      const path = new URL(String(url)).pathname;
      if (path === "/clients/5") {
        if (options?.method === "PUT") {
          saved = JSON.parse(String(options.body));
          return json({ ...client, ...saved });
        }
        return json(client);
      }
      if (path === "/operations") return json({ operations: [], total: 0 });
      return json({});
    }) as typeof fetch;
    dom = await createDom("/admin/clients/5");
    await dom.render(
      <AdminToastProvider>
        <CurrentUserContext.Provider value={admin}>
          <ClientDetailPage clientId={5} />
        </CurrentUserContext.Provider>
      </AdminToastProvider>,
    );
    await click(button(fr.editClient));
    await setValue(element("#client-email"), "discard@example.test");
    await click(button(fr.cancel));
    await click(button(fr.editClient));
    expect((element("#client-email") as HTMLInputElement).value).toBe(
      "ada@example.test",
    );
    await setValue(element("#client-email"), " new@example.test ");
    await click(element("#client-type-professional"));
    await setValue(element("#client-company"), "  Cycle Co  ");
    await submit("dialog form");
    expect(saved).toMatchObject({
      email: "new@example.test",
      isProfessional: true,
      companyName: "Cycle Co",
      siret: null,
    });
    expect(dom.container.querySelector("dialog")).toBeNull();
    expect(dom.container.textContent).toContain("Cycle Co");
  });
});
