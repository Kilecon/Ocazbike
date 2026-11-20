import { defineCase } from "../harness";

export default defineCase("users.recordLogout", ({ users, primaryUser }) =>
  users.recordLogout(primaryUser.id),
);
