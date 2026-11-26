import { defineCase } from "../harness";

export default defineCase(
  "sessions.revokeAllForUser",
  ({ sessions, primaryUser }) => sessions.revokeAllForUser(primaryUser.id),
);
