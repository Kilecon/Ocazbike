import { defineCase } from "../harness";

export default defineCase("users.findById", ({ users, primaryUser }) =>
  users.findById(primaryUser.id),
);
