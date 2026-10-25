import { Elysia } from "elysia";
import {
  decodeUtf8Strict,
  parseJsonStrict,
  RequestEncodingError,
  readBodyBytes,
} from "../encoding/utf8";

const JSON_UTF8 = "application/json; charset=utf-8";

// Elysia hides errors thrown by parsers behind a generic PARSE error, so they are re-thrown from onTransform.
const parseFailures = new WeakMap<Request, RequestEncodingError>();

// Reads JSON bodies as raw bytes so invalid UTF-8 and lone surrogates are rejected, not silently replaced.
export const utf8 = new Elysia({ name: "utf8" })
  .onParse({ as: "global" }, async ({ request, contentType }) => {
    if (!contentType?.toLowerCase().startsWith("application/json")) return;
    try {
      const bytes = await readBodyBytes(request);
      if (bytes.byteLength === 0) return undefined;
      return parseJsonStrict(decodeUtf8Strict(bytes));
    } catch (error) {
      if (!(error instanceof RequestEncodingError)) throw error;
      parseFailures.set(request, error);
      return {};
    }
  })
  .onTransform({ as: "global" }, ({ request }) => {
    const failure = parseFailures.get(request);
    if (failure) throw failure;
  })
  .onAfterHandle({ as: "global" }, ({ responseValue, set }) => {
    if (
      responseValue !== null &&
      typeof responseValue === "object" &&
      !(responseValue instanceof Response) &&
      !(responseValue instanceof Blob) &&
      !(responseValue instanceof ReadableStream)
    ) {
      set.headers["content-type"] = JSON_UTF8;
    }
  });

export { JSON_UTF8 };
