import { Elysia } from "elysia";
import { requireAuth } from "../../features/auth/authorization";
import type { JwtService } from "../../features/auth/jwt";
import type { UserRepository } from "../../features/auth/repositories";

export function emptyRoutes(jwt: JwtService, users: UserRepository) {
  return new Elysia()
    .get("/public/empty", () => [])
    .get("/private/empty", () => [], {
      beforeHandle: requireAuth(jwt, users),
    });
}
