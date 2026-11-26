export function createTestRequest(
  app: { handle(request: Request): Promise<Response> },
  appId: string,
  enforceAppId = false,
) {
  return (path: string, init: RequestInit = {}) => {
    const headers = new Headers({ "X-App-Id": appId });
    new Headers(init.headers).forEach((value, key) => {
      headers.set(key, value);
    });
    if (enforceAppId) headers.set("X-App-Id", appId);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return app.handle(
      new Request(`http://localhost${path}`, { ...init, headers }),
    );
  };
}
