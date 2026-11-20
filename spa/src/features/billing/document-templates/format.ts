export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function addressToHtml(
  ...parts: Array<string | null | undefined>
): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .map((part) =>
      escapeHtml(part)
        .replace(/[,\t ]+(?=\d{5}\s)/g, "<br>")
        .replace(/\r?\n/g, "<br>"),
    )
    .join("<br>");
}

export function formatDocumentDate(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return value;
  }
  const date = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
  }).format(date);
}

export function formatDocumentAmount(value: number | string): string {
  const amount = typeof value === "number" ? value : Number(value);
  if (Number.isFinite(amount) && String(value).trim() !== "") {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  }
  return escapeHtml(String(value));
}
