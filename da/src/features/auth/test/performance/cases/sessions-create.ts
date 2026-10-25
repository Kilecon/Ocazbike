import { defineCase, makeSession } from "../harness";

export default defineCase(
  "sessions.create",
  ({ sessions, primaryUser }, index) =>
    sessions.create(makeSession(`create-${index}`, primaryUser.id)),
);
