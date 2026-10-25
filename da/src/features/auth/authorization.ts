import { Elysia } from "elysia";
import type { AuthConfig } from "./config";
import {
  AuthenticationError,
  ForbiddenRoleError,
  InvalidAuthTokenError,
  PasswordChangeRequiredError,
} from "./errors";
import type { JwtService } from "./jwt";
import type { UserRepository } from "./repositories";
import type { PublicUser } from "./types";

export function authGuard(
  jwt: JwtService,
  users: UserRepository,
  name = "auth-guard",
) {
  return new Elysia({ name })
    .onBeforeHandle(async ({ request }) => {
      await verifyRequest(request, jwt, users);
    })
    .derive(async ({ request }) => {
      const { claims, user: account } = await verifyRequest(
        request,
        jwt,
        users,
      );
      const publicUser: PublicUser = {
        id: Number(claims.sub),
        email: account.email,
        firstname: account.firstname,
        lastname: account.lastname,
        role: account.role,
        isActive: account.isActive,
        mustChangePassword: account.mustChangePassword,
      };
      return { authUser: publicUser };
    });
}

export function requireAuth(
  jwt: JwtService,
  users: UserRepository,
  options: { allowPasswordChangeRequired?: boolean } = {},
) {
  return async ({ request }: { request: Request }) => {
    await verifyRequest(request, jwt, users, options);
  };
}

export function requireAdmin(jwt: JwtService, users: UserRepository) {
  return async ({ request }: { request: Request }) => {
    const { user } = await verifyRequest(request, jwt, users);
    if (user.role !== "Admin") throw new ForbiddenRoleError();
  };
}

export function readAuthUserId(request: Request, jwt: JwtService): number {
  const claims = jwt.verifyAccessToken(getToken(request));
  return Number(claims.sub);
}

async function verifyRequest(
  request: Request,
  jwt: JwtService,
  users: UserRepository,
  options: { allowPasswordChangeRequired?: boolean } = {},
) {
  const claims = jwt.verifyAccessToken(getToken(request));
  const user = await users.findById(Number(claims.sub));
  if (!user?.isActive) {
    throw new InvalidAuthTokenError();
  }
  if (user.mustChangePassword && !options.allowPasswordChangeRequired) {
    throw new PasswordChangeRequiredError();
  }
  return { claims, user };
}

function getToken(request: Request): string {
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) throw new AuthenticationError();

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) throw new AuthenticationError();
  return token;
}

export function protectedRoutes(
  config: Pick<AuthConfig, "appId">,
  jwt: JwtService,
  users: UserRepository,
) {
  void config;
  return new Elysia({ name: "protected-routes" }).use(authGuard(jwt, users));
}
