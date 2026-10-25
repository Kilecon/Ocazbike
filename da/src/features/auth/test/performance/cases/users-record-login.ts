import { defineCase } from "../harness";

export default defineCase("users.recordLogin", ({ users, primaryUser }) =>
  users.recordLogin(primaryUser.id),
);
