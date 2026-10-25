import { createHash, randomUUID } from "node:crypto";
import type { AuthConfig } from "./config";
import {
  DuplicateUserError,
  ForbiddenRoleError,
  InvalidAuthTokenError,
  InvalidCredentialsError,
  InvalidCurrentPasswordError,
  InvalidEmailError,
  InvalidPasswordError,
  InvalidRoleError,
  InvalidUserDataError,
  UserAlreadyActivatedError,
  UserAlreadyDeactivatedError,
  UserNotFoundError,
} from "./errors";
import type { JwtService } from "./jwt";
import { LoginRateLimiter } from "./loginRateLimiter";
import type { PasswordHasher } from "./password";
import type { RefreshSessionRepository, UserRepository } from "./repositories";
import {
  type AuthTokens,
  type CurrentUser,
  type ManagedUser,
  type PublicUser,
  toPublicUser,
} from "./types";

export interface AuthRequestMetadata {
  userAgent?: string;
  ip?: string;
}

// Lets two tabs refresh the same token concurrently without being treated as theft.
const REUSE_GRACE_MS = 10_000;

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: RefreshSessionRepository,
    private readonly passwords: PasswordHasher,
    private readonly jwt: JwtService,
    private readonly config: AuthConfig,
    private readonly loginLimiter = new LoginRateLimiter(),
  ) {}

  async login(
    email: string,
    password: string,
    metadata: AuthRequestMetadata = {},
  ): Promise<AuthTokens> {
    const normalizedEmail = email.trim().toLowerCase();
    const ip = metadata.ip ?? "unknown";
    this.loginLimiter.assertAllowed(normalizedEmail, ip);

    const user = await this.users.findByEmail(normalizedEmail);
    if (
      !user?.isActive ||
      !(await this.passwords.compare(password, user.passwordHash))
    ) {
      this.loginLimiter.recordFailure(normalizedEmail, ip);
      throw new InvalidCredentialsError();
    }
    this.loginLimiter.recordSuccess(normalizedEmail);

    await this.users.recordLogin(user.id, Date.now());
    return this.issueTokens(toPublicUser(user), metadata);
  }

  async refresh(
    refreshToken: string,
    metadata: AuthRequestMetadata = {},
  ): Promise<AuthTokens> {
    const claims = this.jwt.verifyRefreshToken(refreshToken);
    const session = await this.sessions.findById(claims.jti);

    if (!session) {
      throw new InvalidAuthTokenError();
    }

    if (session.revokedAt) {
      // Replaying a rotated token outside the grace window suggests theft.
      if (Date.now() - session.revokedAt.getTime() > REUSE_GRACE_MS) {
        await this.sessions.revokeAllForUser(session.userId);
      }
      throw new InvalidAuthTokenError();
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      throw new InvalidAuthTokenError();
    }

    if (session.tokenHash !== hashToken(refreshToken)) {
      throw new InvalidAuthTokenError();
    }

    const user = await this.users.findById(Number(claims.sub));
    if (!user?.isActive) {
      throw new InvalidAuthTokenError();
    }

    await this.sessions.revoke(session.id);
    return this.issueTokens(toPublicUser(user), metadata);
  }

  async logout(refreshToken: string): Promise<void> {
    const claims = this.jwt.verifyRefreshToken(refreshToken);
    await this.sessions.delete(claims.jti);
    await this.users.recordLogout(Number(claims.sub), Date.now());
  }

  async me(userId: number): Promise<CurrentUser> {
    const user = await this.users.findById(userId);
    if (!user?.isActive) {
      throw new InvalidAuthTokenError();
    }
    return {
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
      lastLoginAtEpochMs: user.lastLoginAtEpochMs,
    };
  }

  async createUser(input: {
    email: string;
    firstname: string;
    lastname: string;
    password: string;
    role?: string;
  }): Promise<PublicUser> {
    const role = input.role ?? "Subadmin";
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new InvalidEmailError();
    }
    if (!input.firstname.trim() || !input.lastname.trim()) {
      throw new InvalidUserDataError();
    }
    if (input.password.length < 12) throw new InvalidPasswordError();
    if (role !== "Admin" && role !== "Subadmin") throw new InvalidRoleError();
    if (await this.users.findByEmail(email)) throw new DuplicateUserError();
    const timestampMs = Date.now();
    const user = await this.users.create({
      email,
      firstname: input.firstname.trim(),
      lastname: input.lastname.trim(),
      passwordHash: await this.passwords.hash(input.password),
      role,
      isActive: true,
      mustChangePassword: true,
      lastLoginAtEpochMs: null,
      createdAtEpochMs: timestampMs,
      updatedAtEpochMs: timestampMs,
    });
    return toPublicUser(user);
  }

  async listUsers(
    activeOnly = true,
    page = 1,
    limit = 10,
  ): Promise<ManagedUser[]> {
    const users = await this.users.list(activeOnly, limit, (page - 1) * limit);
    return users.map((user) => ({
      id: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      lastLoginAtEpochMs: user.lastLoginAtEpochMs,
      createdAtEpochMs: user.createdAtEpochMs,
      updatedAtEpochMs: user.updatedAtEpochMs,
    }));
  }

  async deactivateUser(userId: number, actorId: number): Promise<void> {
    this.assertNotSelf(userId, actorId);
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundError();
    if (!user.isActive) throw new UserAlreadyDeactivatedError();
    await this.users.setActive(userId, false, Date.now());
    await this.sessions.revokeAllForUser(userId);
  }

  async activateUser(userId: number, actorId: number): Promise<void> {
    this.assertNotSelf(userId, actorId);
    const user = await this.users.findById(userId);
    if (!user) throw new UserNotFoundError();
    if (user.isActive) throw new UserAlreadyActivatedError();
    await this.users.setActive(userId, true, Date.now());
  }

  private assertNotSelf(userId: number, actorId: number): void {
    if (userId === actorId) {
      throw new ForbiddenRoleError();
    }
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    password: string,
  ): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user?.isActive) {
      throw new InvalidAuthTokenError();
    }
    if (!(await this.passwords.compare(currentPassword, user.passwordHash))) {
      throw new InvalidCurrentPasswordError();
    }
    if (password.length < 12) throw new InvalidPasswordError();
    await this.users.updatePassword(
      userId,
      await this.passwords.hash(password),
      Date.now(),
    );
  }

  private async issueTokens(
    user: PublicUser,
    metadata: AuthRequestMetadata,
  ): Promise<AuthTokens> {
    const refreshToken = this.jwt.signRefreshToken(
      user.id,
      this.config.refreshTokenTtlSeconds,
    );
    const refreshClaims = this.jwt.verifyRefreshToken(refreshToken);

    await this.sessions.create({
      id: refreshClaims.jti,
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(refreshClaims.exp * 1000),
      revokedAt: null,
      userAgent: metadata.userAgent ?? null,
    });
    await this.sessions.limitActiveSessions(
      user.id,
      this.config.maxSessionsPerUser,
    );

    return {
      accessToken: this.jwt.signAccessToken(
        user.id,
        this.config.accessTokenTtlSeconds,
      ),
      refreshToken,
      expiresIn: this.config.accessTokenTtlSeconds,
      user,
    };
  }
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionId(): string {
  return randomUUID();
}
