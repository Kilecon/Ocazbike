export function jsonBody(body: unknown) {
  return {
    "Content-Type": "application/json",
    body: JSON.stringify(body),
  };
}
