export function formatClientFirstName(firstname: string): string {
  return firstname
    .trim()
    .toLocaleLowerCase("fr")
    .replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("fr"));
}

export function formatClientLastName(lastname: string): string {
  return lastname.trim().toLocaleUpperCase("fr");
}

export function formatClientName(lastname: string, firstname: string): string {
  return `${formatClientLastName(lastname)} ${formatClientFirstName(firstname)}`;
}
