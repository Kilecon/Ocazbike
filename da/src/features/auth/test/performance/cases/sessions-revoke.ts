import { defineCase } from "../harness";

export default defineCase("sessions.revoke", ({ sessions, existingSession }) =>
  sessions.revoke(existingSession.id),
);
