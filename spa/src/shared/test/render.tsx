import { afterEach } from "bun:test";
import { createInstance } from "i18next";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import fr from "@/shared/i18n/translations/fr.json";
import { createTestContext, TestProviders } from "./providers";

const i18n = createInstance();
await i18n.init({ lng: "fr", resources: { fr: { translation: fr } } });

export function restoreBrowserGlobalsAfterEach(
  ...names: ("window" | "document" | "localStorage")[]
) {
  const originals = names.map(
    (name) =>
      [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const,
  );
  afterEach(() => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  });
}

export function setBrowserLocation(pathname: string, search = "") {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { pathname, search } },
  });
}

export function setLightTheme() {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { documentElement: { dataset: { theme: "light" } } },
  });
}

export function renderTranslated(element: ReactNode) {
  const location = (globalThis as { window?: Partial<Window> }).window
    ?.location;
  const path = location ? `${location.pathname}${location.search ?? ""}` : "/";
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <TestProviders {...createTestContext(path)}>{element}</TestProviders>
    </I18nextProvider>,
  );
}
