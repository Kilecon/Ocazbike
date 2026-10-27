const dateTimeFormatters = {
  fr: new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "medium",
    hourCycle: "h23",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }),
  en: new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "medium",
    hourCycle: "h12",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }),
};

export function formatDateTime(timestamp: number, language: string): string {
  const locale = language.toLowerCase().startsWith("fr") ? "fr" : "en";
  return dateTimeFormatters[locale].format(timestamp);
}

export function formatLocalDate(timestamp: number): string {
  const locale =
    typeof navigator === "undefined" ? undefined : navigator.language;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  }).format(timestamp);
}
