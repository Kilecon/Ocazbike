import { defineCase } from "../harness";

export default defineCase("users.updatePassword", ({ users, primaryUser }) =>
  users.updatePassword(primaryUser.id, "updated-benchmark-hash"),
);
