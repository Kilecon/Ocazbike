import { Window } from "happy-dom";
import { createInstance } from "i18next";
import { act, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import fr from "@/shared/i18n/translations/fr.json";
import { createTestContext, TestProviders } from "./providers";

const i18n = createInstance();
await i18n.init({
  lng: "fr",
  resources: { fr: { translation: fr } },
  interpolation: { escapeValue: false },
});

export async function createDom(path = "/admin") {
  const browser = new Window({ url: `http://localhost${path}` });
  browser.document.head.innerHTML = '<meta name="description" content="">';
  Object.defineProperty(browser.navigator, "languages", {
    configurable: true,
    value: ["fr"],
  });
  const names = [
    "window",
    "document",
    "navigator",
    "history",
    "scrollTo",
    "localStorage",
    "HTMLElement",
    "Element",
    "HTMLInputElement",
    "HTMLSelectElement",
    "HTMLTextAreaElement",
    "Node",
    "Event",
    "MouseEvent",
    "KeyboardEvent",
    "PointerEvent",
    "IS_REACT_ACT_ENVIRONMENT",
  ] as const;
  // The router reads the live scroll offsets when it saves positions.
  const scrollOffsets = ["scrollX", "scrollY"] as const;
  const originals = [...names, ...scrollOffsets].map(
    (name) =>
      [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
  );
  const browserRecord = browser as unknown as Record<string, unknown>;
  for (const name of scrollOffsets) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get: () => browser[name],
    });
  }
  for (const name of names) {
    let value = browserRecord[name];
    if (name === "IS_REACT_ACT_ENVIRONMENT") value = true;
    else if (name === "scrollTo") value = browser.scrollTo.bind(browser);
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value,
    });
  }
  const { createRoot } = await import("react-dom/client");
  const container = browser.document.createElement("div");
  browser.document.body.append(container);
  const root = createRoot(container as unknown as Element);
  const context = createTestContext();

  return {
    browser,
    container,
    ...context,
    async render(element: ReactNode) {
      await act(() =>
        Promise.resolve(
          root.render(
            <I18nextProvider i18n={i18n}>
              <TestProviders {...context}>{element}</TestProviders>
            </I18nextProvider>,
          ),
        ),
      );
    },
    async cleanup() {
      try {
        await act(() => Promise.resolve(root.unmount()));
        await browser.happyDOM.abort();
      } finally {
        for (const [name, descriptor] of originals) {
          if (descriptor) Object.defineProperty(globalThis, name, descriptor);
          else Reflect.deleteProperty(globalThis, name);
        }
      }
    },
  };
}

export async function interact(callback: () => void) {
  await act(() => Promise.resolve(callback()));
}

export async function click(target: HTMLElement) {
  await interact(() => target.click());
}

export async function setValue(element: Element, value: string) {
  let prototype: object;
  if (element.tagName === "TEXTAREA") {
    prototype = window.HTMLTextAreaElement.prototype;
  } else if (element.tagName === "SELECT") {
    prototype = window.HTMLSelectElement.prototype;
  } else {
    prototype = window.HTMLInputElement.prototype;
  }
  await interact(() => {
    Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(
      element,
      value,
    );
    element.dispatchEvent(
      new Event(element.tagName === "SELECT" ? "change" : "input", {
        bubbles: true,
      }),
    );
  });
}

/** Flushes React work until `predicate` holds, for async routing and queries. */
export async function waitFor(predicate: () => boolean, timeoutMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  const poll = async (): Promise<void> => {
    if (predicate()) return;
    if (Date.now() > deadline) throw new Error("waitFor timed out");
    await act(() => new Promise((resolve) => setTimeout(resolve, 5)));
    await poll();
  };
  await poll();
}

export type TestDom = Awaited<ReturnType<typeof createDom>>;

/** Query and interaction helpers bound to the DOM of the current test. */
export function domQueries(getDom: () => TestDom | undefined) {
  function hasElement(selector: string) {
    return getDom()?.container.querySelector(selector) != null;
  }
  function element(selector: string): HTMLElement {
    const found = getDom()?.container.querySelector(selector);
    if (!found) throw new Error(`Missing ${selector}`);
    return found as unknown as HTMLElement;
  }
  function button(text: string): HTMLElement;
  function button(text: string, required: false): HTMLElement | null;
  function button(text: string, required = true): HTMLElement | null {
    const found = [
      ...(getDom()?.container.querySelectorAll("button") ?? []),
    ].find((item) => item.textContent?.trim() === text);
    if (!found && required) throw new Error(`Missing button ${text}`);
    return (found ?? null) as unknown as HTMLElement | null;
  }
  async function submit(selector = "form") {
    await interact(() =>
      element(selector).dispatchEvent(
        new Event("submit", { bubbles: true, cancelable: true }),
      ),
    );
  }
  return { hasElement, element, button, click, submit };
}
