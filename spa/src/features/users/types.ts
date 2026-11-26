export interface ManagedUser {
  id: number;
  email: string;
  firstname: string;
  lastname: string;
  role: "Admin" | "Subadmin";
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAtEpochMs: number | null;
  createdAtEpochMs: number;
  updatedAtEpochMs: number;
}
