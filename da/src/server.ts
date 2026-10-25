import { app } from "./app";
import { logger } from "./shared/observability/logger";

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT);

logger.info({
  port: PORT,
  service: process.env.OTEL_SERVICE_NAME ?? "elysia-api",
  message: "Server started",
});

process.on("uncaughtException", (error) => {
  logger.fatal(error);
});

process.on("unhandledRejection", (error) => {
  logger.fatal(error);
});
