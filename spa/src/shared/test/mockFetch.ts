export type FetchCall = { url: string; init: RequestInit };

const originalFetch = globalThis.fetch;

function getFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function mockFetch(
  responses: Array<Response | (() => Response)>,
): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = Object.assign(
    (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
      calls.push({ url: getFetchUrl(input), init });
      const response = responses.shift();
      if (!response) {
        return Promise.reject(new Error("Unexpected fetch"));
      }
      return Promise.resolve(
        typeof response === "function" ? response() : response,
      );
    },
    { preconnect: originalFetch.preconnect },
  );
  return calls;
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}
