import { defineCase } from "../harness";

export default defineCase("users.findByEmail", ({ users }) =>
  users.findByEmail("perf-0@example.test"),
);
