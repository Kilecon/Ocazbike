import { createHmac } from "node:crypto";

/** Extracts the access token from the Set-Cookie headers of an auth response. */
export function accessTokenFrom(response: Response): string {
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const separator = pair.indexOf("=");
    if (pair.slice(0, separator) === "access_token") {
      return decodeURIComponent(pair.slice(separator + 1));
    }
  }
  throw new Error("Response did not set an access_token cookie");
}

/** Synchronously signs a standard HS256 access token for HTTP test fixtures. */
export function signTestAccessToken(
  secret: string,
  userId: number,
  expiresInSeconds: number,
): string {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const content = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
    sub: String(userId),
    type: "access",
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  })}`;
  const signature = createHmac("sha256", secret)
    .update(content)
    .digest("base64url");
  return `${content}.${signature}`;
}
