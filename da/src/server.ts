import { createServerApp } from "./app";
import { logger } from "./shared/observability/logger";

const PORT = Number(process.env.PORT ?? 3000);
const SHUTDOWN_TIMEOUT_MS = 10_000;

const { app, close } = await createServerApp();
app.listen(PORT);

logger.info({
  port: PORT,
  service: process.env.OTEL_SERVICE_NAME ?? "elysia-api",
  message: "Server started",
});

let shuttingDown = false;
async function shutdown(reason: string, exitCode: number) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ message: "Server shutting down", reason });
  const forceExit = setTimeout(
    () => process.exit(exitCode),
    SHUTDOWN_TIMEOUT_MS,
  );
  forceExit.unref();
  try {
    await app.stop();
    close();
  } catch (error) {
    logger.error(error);
  } finally {
    process.exit(exitCode);
  }
}

process.on("SIGTERM", () => void shutdown("SIGTERM", 0));
process.on("SIGINT", () => void shutdown("SIGINT", 0));
process.on("uncaughtException", (error) => {
  logger.fatal(error);
  void shutdown("uncaughtException", 1);
});
process.on("unhandledRejection", (error) => {
  logger.fatal(error);
  void shutdown("unhandledRejection", 1);
});
