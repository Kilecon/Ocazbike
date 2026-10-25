import { defineCase, makeSession } from "../harness";

export default defineCase(
  "sessions.deleteExpired",
  ({ sessions }) => sessions.deleteExpired(),
  ({ sessions, primaryUser }, index) =>
    sessions.create(
      makeSession(
        `expired-${index}`,
        primaryUser.id,
        new Date(Date.now() - 60_000),
      ),
    ),
);
