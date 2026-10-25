export type UserRole = "Admin" | "Subadmin";

export interface User {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAtEpochMs: number | null;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}

export interface PublicUser {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
}

export interface CurrentUser {
  email: string;
  firstname: string;
  lastname: string;
  role: UserRole;
  mustChangePassword: boolean;
  lastLoginAtEpochMs: number | null;
}

export interface ManagedUser {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  role: UserRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAtEpochMs: number | null;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}

export interface AccessTokenClaims {
  sub: string;
  type: "access";
  exp: number;
}

export interface RefreshTokenClaims {
  sub: string;
  type: "refresh";
  jti: string;
  exp: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: PublicUser;
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    firstname: user.firstname,
    lastname: user.lastname,
    role: user.role,
    isActive: user.isActive,
    mustChangePassword: user.mustChangePassword,
  };
}
