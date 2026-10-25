import { defineCase } from "../harness";

export default defineCase("users.setRole", ({ users, primaryUser }, index) =>
  users.setRole(primaryUser.id, index % 2 ? "Admin" : "Subadmin"),
);
