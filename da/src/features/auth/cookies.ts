export const ACCESS_COOKIE_NAME = "access_token";
export const REFRESH_COOKIE_NAME = "refresh_token";
const ACCESS_COOKIE_PATH = "/";
const REFRESH_COOKIE_PATH = "/auth";

function cookie(
  name: string,
  path: string,
  value: string,
  maxAgeSeconds: number,
  secure: boolean,
): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `Max-Age=${maxAgeSeconds}`,
    "HttpOnly",
    "SameSite=Strict",
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export function accessCookie(
  token: string,
  maxAgeSeconds: number,
  secure: boolean,
): string {
  return cookie(
    ACCESS_COOKIE_NAME,
    ACCESS_COOKIE_PATH,
    token,
    maxAgeSeconds,
    secure,
  );
}

export function refreshCookie(
  token: string,
  maxAgeSeconds: number,
  secure: boolean,
): string {
  return cookie(
    REFRESH_COOKIE_NAME,
    REFRESH_COOKIE_PATH,
    token,
    maxAgeSeconds,
    secure,
  );
}

export function clearAuthCookies(secure: boolean): string[] {
  return [accessCookie("", 0, secure), refreshCookie("", 0, secure)];
}

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("Cookie");
  if (!header) return undefined;

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    const value = part.slice(separator + 1).trim();
    if (!value) return undefined;
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}
