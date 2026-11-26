import { defineCase, makeSession } from "../harness";

export default defineCase(
  "sessions.delete",
  ({ sessions }, index) => sessions.delete(`delete-${index}`),
  ({ sessions, primaryUser }, index) =>
    sessions.create(makeSession(`delete-${index}`, primaryUser.id)),
);
