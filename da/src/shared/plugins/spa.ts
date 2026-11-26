import { Elysia } from "elysia";
import type { AuthConfig } from "../../features/auth/config";
import { ForbiddenAppError } from "../../features/auth/errors";

export function spaGuard(config: Pick<AuthConfig, "appId">) {
  return new Elysia({ name: "spa-guard" }).onRequest(({ request }) => {
    const { pathname } = new URL(request.url);
    if (pathname === "/health" || pathname.startsWith("/docs")) return;
    if (request.headers.get("X-App-Id") !== config.appId) {
      throw new ForbiddenAppError();
    }
  });
}
