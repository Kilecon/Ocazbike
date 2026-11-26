export interface AuthSession {
  expiresIn: number;
  user: PublicUser;
}

export interface PublicUser {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  role: "Admin" | "Subadmin";
  isActive: boolean;
  mustChangePassword: boolean; // WARN : A voir
}

export interface CurrentUser {
  email: string;
  firstname: string;
  lastname: string;
  role: "Admin" | "Subadmin";
  mustChangePassword: boolean;
  lastLoginAtEpochMs: number | null;
}
