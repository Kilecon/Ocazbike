/**
 * Centralised UTF-8 / Unicode guards used at every text boundary
 * (HTTP request, encryption, decryption, HTTP response).
 */

export const MAX_BODY_BYTES = Number(process.env.MAX_BODY_BYTES ?? 1_048_576);
const MAX_JSON_DEPTH = 32;

export class RequestEncodingError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(code: string, statusCode: number, message: string) {
    super(message);
    this.name = "RequestEncodingError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const invalidUtf8 = () =>
  new RequestEncodingError(
    "INVALID_UTF8",
    400,
    "Request body is not valid UTF-8",
  );
export const invalidUnicode = () =>
  new RequestEncodingError(
    "INVALID_UNICODE",
    422,
    "Request contains an unpaired UTF-16 surrogate",
  );
export const payloadTooLarge = () =>
  new RequestEncodingError("PAYLOAD_TOO_LARGE", 413, "Request body too large");

/** Decodes bytes as UTF-8 and throws instead of substituting U+FFFD. */
export function decodeUtf8Strict(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      bytes,
    );
  } catch {
    throw invalidUtf8();
  }
}

/** Throws when a string contains an isolated UTF-16 surrogate. */
export function assertWellFormed(value: string): void {
  if (!value.isWellFormed()) throw invalidUnicode();
}

/** Recursively checks keys and values of a parsed JSON document. */
export function assertWellFormedDeep(value: unknown, depth = 0): void {
  if (depth > MAX_JSON_DEPTH) {
    throw new RequestEncodingError(
      "JSON_TOO_DEEP",
      400,
      "JSON nesting is too deep",
    );
  }
  if (typeof value === "string") {
    assertWellFormed(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertWellFormedDeep(item, depth + 1);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      assertWellFormed(key);
      assertWellFormedDeep(item, depth + 1);
    }
  }
}

/** Reads a request body once, enforcing the size limit while streaming. */
export async function readBodyBytes(
  request: Request,
  limit = MAX_BODY_BYTES,
): Promise<Uint8Array> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) throw payloadTooLarge();
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw payloadTooLarge();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export function parseJsonStrict(text: string): unknown {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new RequestEncodingError("INVALID_JSON", 400, "Malformed JSON body");
  }
  assertWellFormedDeep(parsed);
  return parsed;
}
