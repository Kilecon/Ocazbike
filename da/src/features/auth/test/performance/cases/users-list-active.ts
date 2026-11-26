import { defineCase } from "../harness";

export default defineCase("users.list(activeOnly)", ({ users }) =>
  users.list(),
);
