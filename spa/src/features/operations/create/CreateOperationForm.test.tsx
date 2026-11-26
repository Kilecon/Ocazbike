import { afterEach, describe, expect, it } from "bun:test";
import { act, type ComponentProps } from "react";
import fr from "@/shared/i18n/translations/fr.json";
import {
  createDom,
  domQueries,
  interact,
  setValue,
  type TestDom,
} from "@/shared/test/dom";
import { json } from "@/shared/test/mockFetch";
import { AdminToastProvider } from "@/shared/ui/AdminToast";
import { CreateOperationForm } from "./CreateOperationForm";

let dom: TestDom | undefined;
const originalFetch = globalThis.fetch;
afterEach(async () => {
  await dom?.cleanup();
  dom = undefined;
  globalThis.fetch = originalFetch;
});
const { element, button, click, submit } = domQueries(() => dom);

describe("CreateOperationForm", () => {
  it.each(["repair", "sale", "purchase", "rental"] as const)(
    "selects start then end dates by default for a %s and prioritizes explicitly focused fields",
    async (type) => {
      dom = await createDom();
      await dom.render(
        <AdminToastProvider>
          <CreateOperationForm
            type={type}
            saving={false}
            onCancel={() => {}}
            onSubmit={async () => {}}
          />
        </AdminToastProvider>,
      );
      const readDates = () => ({
        date: (element("#operation-date") as HTMLInputElement).value,
        start: (element("#operation-service-start") as HTMLInputElement).value,
        end: (element("#operation-service-end") as HTMLInputElement).value,
      });
      const initialDate = readDates().date;
      await setValue(
        element(".rdp-dropdowns > span:nth-child(2) select"),
        "2026",
      );
      await setValue(element(".rdp-dropdowns > span:first-child select"), "10");
      await click(element('.oz-date-picker [data-day="2026-11-04"] button'));
      expect(readDates()).toEqual({
        date: initialDate,
        start: "04/11/2026",
        end: "",
      });
      await click(element('.oz-date-picker [data-day="2026-11-08"] button'));
      expect(readDates()).toEqual({
        date: initialDate,
        start: "04/11/2026",
        end: "08/11/2026",
      });
      await click(element('.oz-date-picker [data-day="2026-11-09"] button'));
      expect(readDates()).toEqual({
        date: initialDate,
        start: "04/11/2026",
        end: "09/11/2026",
      });
      await interact(() => element("#operation-date").focus());
      await setValue(
        element(".rdp-dropdowns > span:nth-child(2) select"),
        "2026",
      );
      await setValue(element(".rdp-dropdowns > span:first-child select"), "10");
      await click(element('.oz-date-picker [data-day="2026-11-03"] button'));
      expect(readDates()).toEqual({
        date: "03/11/2026",
        start: "04/11/2026",
        end: "09/11/2026",
      });
      await interact(() => element("#operation-service-start").focus());
      await click(element('.oz-date-picker [data-day="2026-11-05"] button'));
      await click(element('.oz-date-picker [data-day="2026-11-06"] button'));
      expect(readDates()).toEqual({
        date: "03/11/2026",
        start: "06/11/2026",
        end: "09/11/2026",
      });
      await interact(() => element("#operation-service-end").focus());
      await click(element('.oz-date-picker [data-day="2026-11-10"] button'));
      expect(readDates()).toEqual({
        date: "03/11/2026",
        start: "06/11/2026",
        end: "10/11/2026",
      });
    },
  );

  it.each(["repair", "sale", "purchase", "rental"] as const)(
    "creates a %s in two validated steps and retains dates and discounted lines when going back",
    async (type) => {
      globalThis.fetch = (async (_input: string | URL | Request) =>
        json({
          clients: [
            {
              id: 5,
              firstname: "Ada",
              lastname: "Lovelace",
              email: "ada@example.test",
            },
          ],
          page: 1,
          limit: 5,
          total: 1,
        })) as typeof fetch;
      dom = await createDom();
      const submitted: Parameters<
        ComponentProps<typeof CreateOperationForm>["onSubmit"]
      >[0][] = [];
      await dom.render(
        <AdminToastProvider>
          <CreateOperationForm
            type={type}
            saving={false}
            onCancel={() => {}}
            onSubmit={async (input) => {
              submitted.push(input);
            }}
          />
        </AdminToastProvider>,
      );
      expect(button(fr.continueToBilling).hasAttribute("disabled")).toBe(true);
      await setValue(element("#operation-client"), "Ada");
      await act(() => new Promise((resolve) => setTimeout(resolve, 400)));
      await click(element('[role="option"]'));
      await setValue(element("#operation-date"), "31/02/2026");
      await submit();
      expect(
        dom.container.querySelector("fieldset:not([hidden]) #operation-date"),
      ).not.toBeNull();
      await setValue(element("#operation-date"), "03/11/2026");
      if (type === "rental") {
        await submit();
        expect(
          dom.container.querySelector("fieldset:not([hidden]) #operation-date"),
        ).not.toBeNull();
      }
      await setValue(element("#operation-service-start"), "04/11/2026");
      await setValue(element("#operation-service-end"), "03/11/2026");
      expect(button(fr.continueToBilling).hasAttribute("disabled")).toBe(true);
      expect(
        element("#operation-service-end").getAttribute("aria-invalid"),
      ).toBe("true");
      expect(dom.container.textContent).toContain(fr.serviceEndBeforeStart);
      await submit();
      expect(dom.container.querySelector("#operation-date")).not.toBeNull();
      expect(submitted).toHaveLength(0);
      await setValue(element("#operation-service-end"), "04/11/2026");
      expect(button(fr.continueToBilling).hasAttribute("disabled")).toBe(false);
      expect(
        element("#operation-service-end").getAttribute("aria-invalid"),
      ).toBeNull();
      await setValue(element("#operation-service-start"), "05/11/2026");
      expect(button(fr.continueToBilling).hasAttribute("disabled")).toBe(true);
      await setValue(element("#operation-service-start"), "04/11/2026");
      await setValue(element("#operation-service-end"), "08/11/2026");
      expect(button(fr.continueToBilling).hasAttribute("disabled")).toBe(false);
      await interact(() => element("#operation-service-start").focus());
      await setValue(element("#operation-service-start"), "31/02/2026");
      await click(element('.oz-date-picker [data-day="2026-11-04"] button'));
      expect(
        (element("#operation-service-start") as HTMLInputElement).validity
          .valid,
      ).toBe(true);
      await click(element('.oz-date-picker [data-day="2026-11-05"] button'));
      expect(
        (element("#operation-service-start") as HTMLInputElement).value,
      ).toBe("05/11/2026");
      expect((element("#operation-date") as HTMLInputElement).value).toBe(
        "03/11/2026",
      );
      await submit();
      expect(submitted).toHaveLength(0);
      expect(
        dom.container.querySelector(
          "fieldset:not([hidden]) #operation-comment",
        ),
      ).not.toBeNull();
      expect(
        (element("#operation-create-quote") as HTMLInputElement).checked,
      ).toBe(true);
      expect(
        (element("#operation-send-quote-email") as HTMLInputElement).checked,
      ).toBe(false);
      expect(element("#operation-send-quote-email").getAttribute("role")).toBe(
        "switch",
      );
      expect(
        dom.container.querySelector("#operation-line-discount-1"),
      ).toBeNull();
      await click(element("#operation-send-quote-email"));
      expect(
        element("#operation-send-quote-email").getAttribute("aria-checked"),
      ).toBe("true");
      await click(element("#operation-create-quote"));
      expect(
        dom.container.querySelector("#operation-send-quote-email"),
      ).toBeNull();
      await click(element("#operation-create-quote"));
      // Happy DOM incorrectly flags decimal steps using floating-point modulo.
      for (const input of dom.container.querySelectorAll('input[step="0.01"]'))
        input.setAttribute("step", "any");
      await submit();
      expect(submitted).toHaveLength(0);
      await setValue(element("#operation-line-description-1"), "Révision");
      await setValue(element("#operation-line-quantity-1"), "2");
      await setValue(element("#operation-line-price-1"), "50");
      await setValue(element("#operation-line-discount-amount-1"), "101");
      await submit();
      expect(submitted).toHaveLength(0);
      await setValue(element("#operation-line-discount-amount-1"), "10");
      expect(
        (element("#operation-line-total-1") as HTMLInputElement).value,
      ).toBe("120.00");
      expect(
        (element("#operation-line-discount-description-1") as HTMLInputElement)
          .value,
      ).toBe("Remise révision");
      expect(
        (element("#operation-line-discount-unitPrice-1") as HTMLInputElement)
          .value,
      ).toBe("-10.00");
      expect(
        (element("#operation-line-discount-total-1") as HTMLInputElement).value,
      ).toBe("-12.00");
      expect(dom.container.textContent).toContain("108,00");
      await setValue(element("#operation-line-discount-amount-1"), "0");
      expect(dom.container.querySelector('[data-discount-for="1"]')).toBeNull();
      await setValue(element("#operation-line-discount-amount-1"), "10");
      await setValue(element("#operation-comment"), "À conserver");
      await click(button(fr.previousPage));
      expect(
        (element("#operation-service-start") as HTMLInputElement).value,
      ).toBe("05/11/2026");
      await submit();
      for (const input of dom.container.querySelectorAll('input[step="0.01"]'))
        input.setAttribute("step", "any");
      expect((element("#operation-comment") as HTMLTextAreaElement).value).toBe(
        "À conserver",
      );
      expect(
        (element("#operation-line-discount-amount-1") as HTMLInputElement)
          .value,
      ).toBe("10");
      expect(
        (element("#operation-send-quote-email") as HTMLInputElement).checked,
      ).toBe(true);
      await submit();
      expect(submitted).toHaveLength(1);
      expect(submitted[0]).toMatchObject({
        clientId: 5,
        date: "2026-11-03T12:00:00Z",
        serviceStartAt: "2026-11-05T00:00:00Z",
        serviceEndAt: "2026-11-08T23:59:59Z",
        createQuote: true,
        sendQuoteEmail: true,
        comment: "À conserver",
        lines: [
          {
            description: "Révision",
            quantity: "2",
            unitPrice: "50",
            vatRate: "20",
            discount: "0",
            total: "120.00",
          },
          {
            description: "Remise révision",
            quantity: "1",
            unitPrice: "-10.00",
            vatRate: "20",
            discount: "0",
            total: "-12.00",
          },
        ],
      });
    },
  );

  it("adjusts billing quantities with minus and plus buttons under shared column headers", async () => {
    globalThis.fetch = (async (_input: string | URL | Request) =>
      json({
        clients: [{ id: 5, firstname: "Ada", lastname: "Lovelace", email: "" }],
        page: 1,
        limit: 5,
        total: 1,
      })) as typeof fetch;
    dom = await createDom();
    let submissions = 0;
    await dom.render(
      <AdminToastProvider>
        <CreateOperationForm
          type="sale"
          saving={false}
          onCancel={() => {}}
          onSubmit={async () => {
            submissions += 1;
          }}
        />
      </AdminToastProvider>,
    );
    await setValue(element("#operation-client"), "Ada");
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)));
    await click(element('[role="option"]'));
    await submit();
    const decrease = element(`button[aria-label="${fr.decreaseQuantity}"]`);
    const increase = element(`button[aria-label="${fr.increaseQuantity}"]`);
    expect(decrease.hasAttribute("disabled")).toBe(true);
    await setValue(element("#operation-line-description-1"), "Pneu");
    await setValue(element("#operation-line-price-1"), "20");
    await setValue(element("#operation-line-discount-amount-1"), "5");
    await click(increase);
    expect(
      (element("#operation-line-quantity-1") as HTMLInputElement).value,
    ).toBe("2");
    expect((element("#operation-line-total-1") as HTMLInputElement).value).toBe(
      "48.00",
    );
    expect(dom.container.textContent).toContain("42,00");
    await click(decrease);
    expect(
      (element("#operation-line-quantity-1") as HTMLInputElement).value,
    ).toBe("1");
    expect(decrease.hasAttribute("disabled")).toBe(true);
    expect(dom.container.textContent).toContain("18,00");
    await setValue(element("#operation-line-quantity-1"), "");
    expect(decrease.hasAttribute("disabled")).toBe(true);
    expect(increase.hasAttribute("disabled")).toBe(true);
    await setValue(element("#operation-line-quantity-1"), "3");
    await click(element(`button[aria-label="${fr.addBillingLine}"]`));
    await click(
      element(
        `button[aria-label="${fr.increaseQuantity}"][aria-controls="operation-line-quantity-2"]`,
      ),
    );
    expect(
      (element("#operation-line-quantity-1") as HTMLInputElement).value,
    ).toBe("3");
    expect(
      (element("#operation-line-quantity-2") as HTMLInputElement).value,
    ).toBe("2");
    expect(
      [...dom.container.querySelectorAll("thead th")].map(
        (heading) => heading.textContent,
      ),
    ).toEqual([
      `${fr.description}*`,
      `${fr.quantity}*`,
      `${fr.unitPrice}*`,
      `${fr.vatRate}*`,
      fr.lineDiscountAmount,
      fr.lineTotalAmount,
      fr.usersActions,
    ]);
    expect(dom.container.querySelectorAll("tbody tr")).toHaveLength(3);
    expect(dom.container.querySelectorAll("tbody label")).toHaveLength(0);
    expect(
      element("#operation-line-quantity-2").getAttribute("aria-label"),
    ).toBe(fr.quantity);
    expect(submissions).toBe(0);
  });

  it("keeps automatic discounts adjacent, preserves uppercase words, and removes discounts with their billing line", async () => {
    globalThis.fetch = (async (_input: string | URL | Request) =>
      json({
        clients: [{ id: 5, firstname: "Ada", lastname: "Lovelace", email: "" }],
        page: 1,
        limit: 5,
        total: 1,
      })) as typeof fetch;
    dom = await createDom();
    const submitted: Parameters<
      ComponentProps<typeof CreateOperationForm>["onSubmit"]
    >[0][] = [];
    await dom.render(
      <AdminToastProvider>
        <CreateOperationForm
          type="repair"
          saving={false}
          onCancel={() => {}}
          onSubmit={async (input) => {
            submitted.push(input);
          }}
        />
      </AdminToastProvider>,
    );
    await setValue(element("#operation-client"), "Ada");
    await act(() => new Promise((resolve) => setTimeout(resolve, 400)));
    await click(element('[role="option"]'));
    await submit();
    expect(
      (element("#operation-send-quote-email") as HTMLInputElement).disabled,
    ).toBe(true);
    expect(dom.container.textContent).toContain(fr.clientEmailMissingHint);
    await setValue(element("#operation-line-description-1"), "  VTT carbone  ");
    await setValue(element("#operation-line-price-1"), "40");
    await setValue(element("#operation-line-discount-amount-1"), "5");
    expect(
      (element("#operation-line-discount-description-1") as HTMLInputElement)
        .value,
    ).toBe("Remise VTT carbone");
    await setValue(element("#operation-line-description-1"), "eBike carbone");
    expect(
      (element("#operation-line-discount-description-1") as HTMLInputElement)
        .value,
    ).toBe("Remise ebike carbone");
    await click(element(`button[aria-label="${fr.addBillingLine}"]`));
    await setValue(element("#operation-line-description-2"), "Étrier Avant");
    await setValue(element("#operation-line-price-2"), "60");
    await setValue(element("#operation-line-vat-2"), "5.5");
    await setValue(element("#operation-line-discount-amount-2"), "10");
    expect(
      [
        ...dom.container.querySelectorAll(
          'input[id^="operation-line-description-"], input[id^="operation-line-discount-description-"]',
        ),
      ].map((input) => (input as unknown as HTMLInputElement).value),
    ).toEqual([
      "eBike carbone",
      "Remise ebike carbone",
      "Étrier Avant",
      "Remise étrier Avant",
    ]);
    expect(
      (element("#operation-line-discount-total-2") as HTMLInputElement).value,
    ).toBe("-10.55");
    for (const input of dom.container.querySelectorAll('input[step="0.01"]'))
      input.setAttribute("step", "any");
    await submit();
    expect(submitted).toHaveLength(1);
    expect(submitted[0]?.lines).toEqual([
      {
        description: "eBike carbone",
        quantity: "1",
        unitPrice: "40",
        vatRate: "20",
        discount: "0",
        total: "48.00",
      },
      {
        description: "Remise ebike carbone",
        quantity: "1",
        unitPrice: "-5.00",
        vatRate: "20",
        discount: "0",
        total: "-6.00",
      },
      {
        description: "Étrier Avant",
        quantity: "1",
        unitPrice: "60",
        vatRate: "5.5",
        discount: "0",
        total: "63.30",
      },
      {
        description: "Remise étrier Avant",
        quantity: "1",
        unitPrice: "-10.00",
        vatRate: "5.5",
        discount: "0",
        total: "-10.55",
      },
    ]);
    await click(element(`button[aria-label="${fr.removeBillingLine}"]`));
    expect(
      dom.container.querySelector("#operation-line-description-1"),
    ).toBeNull();
    expect(dom.container.querySelector('[data-discount-for="1"]')).toBeNull();
    await setValue(element("#operation-line-discount-amount-2"), "");
    expect(dom.container.querySelector('[data-discount-for="2"]')).toBeNull();
    await submit();
    expect(submitted).toHaveLength(2);
    expect(submitted[1]?.lines).toEqual(submitted[0]?.lines.slice(2, 3));
  });
});
