import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./translations/en.json";
import fr from "./translations/fr.json";

export const supportedLanguages = ["fr", "en"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];
export type TranslationKey = keyof typeof en;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: {
      translation: typeof en;
    };
  }
}

const resources = {
  fr: { translation: fr },
  en: { translation: en },
} satisfies Record<SupportedLanguage, { translation: typeof en }>;

function syncDocumentMetadata(language: SupportedLanguage) {
  const translation = resources[language].translation;
  const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
  const page =
    pathname === "/velo"
      ? "catalog"
      : pathname.startsWith("/admin")
        ? "admin"
        : "home";
  const description = document.querySelector<HTMLMetaElement>(
    'meta[name="description"]',
  );

  if (!description) {
    throw new Error('Missing meta[name="description"] element');
  }

  document.documentElement.lang = language;
  document.title = translation[`${page}MetaTitle`];
  description.content = translation[`${page}MetaDescription`];
}

function getBrowserLanguage(): SupportedLanguage {
  const preferredLanguages = navigator.languages.length
    ? navigator.languages
    : [navigator.language];
  for (const language of preferredLanguages) {
    const supportedLanguage = language.toLowerCase().split("-")[0];
    if (supportedLanguage === "fr" || supportedLanguage === "en") {
      return supportedLanguage;
    }
  }
  return "en";
}

function getInitialLanguage(): SupportedLanguage {
  const isAdminPage = window.location.pathname.startsWith("/admin");
  if (isAdminPage) return getBrowserLanguage();

  const storedLanguage = localStorage.getItem("language");
  if (storedLanguage === "fr" || storedLanguage === "en") {
    return storedLanguage;
  }

  return getBrowserLanguage();
}

const initialLanguage = getInitialLanguage();

export async function changeLanguage(language: SupportedLanguage) {
  await i18n.changeLanguage(language);
  syncDocumentMetadata(language);
  localStorage.setItem("language", language);
}

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});
syncDocumentMetadata(initialLanguage);

export function translate(key: TranslationKey): string {
  return i18n.t(key);
}

export default i18n;
