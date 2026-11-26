import { defineCase, makeSession } from "../harness";

export default defineCase(
  "sessions.limitActiveSessions",
  ({ sessions, primaryUser }) =>
    sessions.limitActiveSessions(primaryUser.id, 20),
  async ({ database, sessions, primaryUser }, index) => {
    if (index === 0) {
      database.sqlite.run("DELETE FROM refresh_sessions");
      await Promise.all(
        Array.from({ length: 20 }, (_, seed) =>
          sessions.create(makeSession(`limit-seed-${seed}`, primaryUser.id)),
        ),
      );
    }
    await sessions.create(makeSession(`limit-${index}`, primaryUser.id));
  },
);
