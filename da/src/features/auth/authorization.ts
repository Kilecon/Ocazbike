import { ACCESS_COOKIE_NAME, readCookie } from "./cookies";
import {
  AuthenticationError,
  ForbiddenRoleError,
  InvalidAuthTokenError,
  PasswordChangeRequiredError,
} from "./errors";
import type { IUserRepository } from "./IAuthRepositories";
import type { JwtService } from "./jwt";
import type { User } from "./types";

const authenticatedUsers = new WeakMap<Request, User>();

export function requireAuth(
  jwt: JwtService,
  users: IUserRepository,
  options: { allowPasswordChangeRequired?: boolean } = {},
) {
  return async ({ request }: { request: Request }) => {
    await verifyRequest(request, jwt, users, options);
  };
}

export function requireAdmin(jwt: JwtService, users: IUserRepository) {
  return async ({ request }: { request: Request }) => {
    const user = await verifyRequest(request, jwt, users);
    if (user.role !== "Admin") throw new ForbiddenRoleError();
  };
}

/** Returns the user id verified by requireAuth/requireAdmin for this request. */
export function readAuthUserId(request: Request): number {
  const user = authenticatedUsers.get(request);
  if (!user) throw new AuthenticationError();
  return user.id;
}

async function verifyRequest(
  request: Request,
  jwt: JwtService,
  users: IUserRepository,
  options: { allowPasswordChangeRequired?: boolean } = {},
): Promise<User> {
  const claims = await jwt.verifyAccessToken(getToken(request));
  const user = await users.findById(Number(claims.sub));
  if (!user?.isActive) {
    throw new InvalidAuthTokenError();
  }
  if (user.mustChangePassword && !options.allowPasswordChangeRequired) {
    throw new PasswordChangeRequiredError();
  }
  authenticatedUsers.set(request, user);
  return user;
}

function getToken(request: Request): string {
  const token = readCookie(request, ACCESS_COOKIE_NAME);
  if (!token) throw new AuthenticationError();
  return token;
}
