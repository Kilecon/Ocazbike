import { defineCase } from "../harness";

export default defineCase(
  "sessions.findById",
  ({ sessions, existingSession }) => sessions.findById(existingSession.id),
);
