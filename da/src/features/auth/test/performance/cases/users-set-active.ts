import { defineCase } from "../harness";

export default defineCase("users.setActive", ({ users, primaryUser }, index) =>
  users.setActive(primaryUser.id, index % 2 === 0),
);
