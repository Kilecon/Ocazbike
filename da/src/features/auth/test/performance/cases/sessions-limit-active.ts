import { defineCase, makeSession } from "../harness";

export default defineCase(
  "sessions.limitActiveSessions",
  ({ sessions, primaryUser }) =>
    sessions.limitActiveSessions(primaryUser.id, 20),
  async ({ database, sessions, primaryUser }, index) => {
    if (index === 0) {
      database.sqlite.exec("DELETE FROM refresh_sessions");
      for (let seed = 0; seed < 20; seed += 1) {
        await sessions.create(
          makeSession(`limit-seed-${seed}`, primaryUser.id),
        );
      }
    }
    await sessions.create(makeSession(`limit-${index}`, primaryUser.id));
  },
);
