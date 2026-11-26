import { defineCase } from "../harness";

export default defineCase("users.create", ({ users }, index) =>
  users.create({
    email: `created-${index}@example.test`,
    firstname: "Created",
    lastname: "Benchmark",
    passwordHash: "benchmark-password-hash",
    role: "Subadmin",
    isActive: true,
    mustChangePassword: false,
    lastLoginAtEpochMs: null,
    createdAtEpochMs: Date.now(),
    updatedAtEpochMs: Date.now(),
  }),
);
