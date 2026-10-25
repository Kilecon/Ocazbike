import { meter } from "../plugins/telemetry";

export const requestsCounter = meter.createCounter("http_requests_total", {
  description: "Total HTTP requests",
});

export const errorsCounter = meter.createCounter("http_errors_total");

export const usersCounter = meter.createCounter("users_created_total");

export const loginRateLimitBlocksCounter = meter.createCounter(
  "auth_login_rate_limit_blocks_total",
  {
    description: "Login rate-limit lock events by subject type",
  },
);
