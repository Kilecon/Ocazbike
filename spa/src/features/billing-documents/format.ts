export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function addAddressBreaks(value: string): string {
  let result = "";
  let cursor = 0;
  for (const match of value.matchAll(/\d{5}\s/g)) {
    const postcodeStart = match.index;
    let separatorStart = postcodeStart;
    while (separatorStart > cursor) {
      const character = value[separatorStart - 1];
      if (character !== "," && character !== "\t" && character !== " ") {
        break;
      }
      separatorStart--;
    }
    if (separatorStart < postcodeStart) {
      result += `${value.slice(cursor, separatorStart)}<br>`;
      cursor = postcodeStart;
    }
  }
  return result + value.slice(cursor);
}

export function addressToHtml(
  ...parts: Array<string | null | undefined>
): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .map((part) => addAddressBreaks(escapeHtml(part)).replace(/\r?\n/g, "<br>"))
    .join("<br>");
}

export function formatDocumentDate(
  value: string | number | null | undefined,
): string {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "string" && /^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
    return value;
  }
  const date = new Date(value);
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
