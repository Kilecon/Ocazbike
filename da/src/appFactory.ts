import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { trace } from "@opentelemetry/api";
import { Elysia, ParseError, ValidationError } from "elysia";
import type { AuthConfig } from "./features/auth/config";
import {
  AuthenticationError,
  DuplicateUserError,
  ForbiddenAppError,
  ForbiddenRoleError,
  InvalidAuthTokenError,
  InvalidCurrentPasswordError,
  InvalidEmailError,
  InvalidPasswordError,
  InvalidRoleError,
  InvalidUserDataError,
  PasswordChangeRequiredError,
  TooManyAttemptsError,
  UserAlreadyActivatedError,
  UserAlreadyDeactivatedError,
  UserNotFoundError,
} from "./features/auth/errors";
import { JwtService } from "./features/auth/jwt";
import { LoginRateLimiter } from "./features/auth/loginRateLimiter";
import type { PasswordHasher } from "./features/auth/password";
import type {
  RefreshSessionRepository,
  UserRepository,
} from "./features/auth/repositories";
import { authRoutes } from "./features/auth/routes";
import { AuthService } from "./features/auth/service";
import type { IBillingDocumentRepository } from "./features/billing/IBillingDocumentRepository";
import { createBillingDocumentRoutes } from "./features/billing/routes/billingDocuments";
import { createRepairRoutes } from "./features/billing/routes/repairs";
import type { ClientDataProtector } from "./features/clients/crypto/ClientDataProtector";
import type { IClientRepository } from "./features/clients/IClientRepository";
import { createClientRoutes } from "./features/clients/routes";
import { ClientService } from "./features/clients/service";
import type {
  ISupportRequestRepository,
  SupportNotifier,
} from "./features/support/ISupportRequestRepository";
import { DiscordSupportNotifier } from "./features/support/infrastructure/DiscordSupportNotifier";
import { DrizzleSupportRequestRepository } from "./features/support/infrastructure/DrizzleSupportRequestRepository";
import { createSupportRoutes } from "./features/support/routes";
import { API_DOCUMENTATION } from "./shared/documentation/api-documentation";
import { RequestEncodingError } from "./shared/encoding/utf8";
import { logger } from "./shared/observability/logger";
import { errorsCounter, requestsCounter } from "./shared/observability/metrics";
import { spaGuard } from "./shared/plugins/spa";
import { telemetry } from "./shared/plugins/telemetry";
import { JSON_UTF8, utf8 } from "./shared/plugins/utf8";
import {
  RateLimitExceededError,
  RequestRateLimiter,
} from "./shared/rate-limiting/RequestRateLimiter";
import { emptyRoutes } from "./shared/routes/empty";
import { healthRoutes } from "./shared/routes/health";

export interface AuthDependencies {
  users: UserRepository;
  sessions: RefreshSessionRepository;
  passwords: PasswordHasher;
  billingDocuments?: IBillingDocumentRepository;
  clients?: IClientRepository;
  clientDataProtector?: ClientDataProtector;
  supportRequests?: ISupportRequestRepository;
  supportNotifier?: SupportNotifier;
}

export interface AppOptions {
  requestRateLimiter?: RequestRateLimiter;
}

const jsonError = (
  status: number,
  code: string,
  message: string,
  headers: Record<string, string> = {},
) =>
  new Response(JSON.stringify({ code, message }), {
    status,
    headers: { "Content-Type": JSON_UTF8, ...headers },
  });

export function createApp(
  config: AuthConfig,
  dependencies: AuthDependencies,
  options: AppOptions = {},
) {
  const requestRateLimiter =
    options.requestRateLimiter ?? new RequestRateLimiter();
  const jwt = new JwtService(config.jwtSecret);
  const service = new AuthService(
    dependencies.users,
    dependencies.sessions,
    dependencies.passwords,
    jwt,
    config,
    new LoginRateLimiter({
      maxFailures: config.loginRateLimitMaxFailures,
      windowMs: config.loginRateLimitWindowMs,
      lockMs: config.loginRateLimitLockMs,
    }),
  );
  const { users } = dependencies;

  const app = new Elysia()
    .use(
      cors({
        origin: (process.env.CORS_ORIGIN ?? "http://localhost:3111")
          .split(",")
          .map((origin) => origin.trim())
          .filter(Boolean),
        allowedHeaders: ["Content-Type", "X-App-Id", "Authorization"],
        credentials: true,
      }),
    )
    .use(telemetry)
    .use(utf8)
    .onRequest(({ request }) => {
      requestsCounter.add(1);
      logger.info({ method: request.method, url: request.url });
    })
    .onRequest(({ request, server }) => {
      requestRateLimiter.assertAllowed(
        server?.requestIP(request)?.address ?? "unknown",
      );
    })
    .onError({ as: "global" }, ({ error, request }) => {
      errorsCounter.add(1);

      if (error instanceof RequestEncodingError) {
        return jsonError(error.statusCode, error.code, error.message);
      }
      if (error instanceof TooManyAttemptsError) {
        return jsonError(error.statusCode, error.code, error.message, {
          "Retry-After": String(error.retryAfterSeconds),
        });
      }
      if (error instanceof RateLimitExceededError) {
        return jsonError(error.statusCode, error.code, error.message, {
          "Retry-After": String(error.retryAfterSeconds),
        });
      }
      if (
        error instanceof AuthenticationError ||
        error instanceof InvalidAuthTokenError ||
        error instanceof ForbiddenAppError ||
        error instanceof ForbiddenRoleError ||
        error instanceof PasswordChangeRequiredError ||
        error instanceof DuplicateUserError ||
        error instanceof UserNotFoundError ||
        error instanceof UserAlreadyActivatedError ||
        error instanceof UserAlreadyDeactivatedError ||
        error instanceof InvalidCurrentPasswordError ||
        error instanceof InvalidPasswordError ||
        error instanceof InvalidEmailError ||
        error instanceof InvalidUserDataError ||
        error instanceof InvalidRoleError
      ) {
        return jsonError(error.statusCode, error.code, error.message);
      }
      if (
        (error instanceof ValidationError || error instanceof ParseError) &&
        (new URL(request.url).pathname.startsWith("/auth/") ||
          new URL(request.url).pathname.startsWith("/users") ||
          new URL(request.url).pathname.startsWith("/clients"))
      ) {
        return jsonError(400, "BAD_REQUEST", "Invalid request data");
      }

      const span = trace.getActiveSpan();
      logger.error({
        method: request.method,
        url: request.url,
        traceId: span?.spanContext().traceId,
        spanId: span?.spanContext().spanId,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    })
    .use(
      swagger({
        path: API_DOCUMENTATION.swagger.path,
        exclude: API_DOCUMENTATION.swagger.exclude,
        scalarConfig: API_DOCUMENTATION.swagger.scalarConfig,
        documentation: {
          info: API_DOCUMENTATION.info,
          tags: API_DOCUMENTATION.tags,
        },
      } as never),
    )
    .use(spaGuard(config))
    .use(healthRoutes)
    .use(authRoutes(service, jwt, users, config))
    .use(emptyRoutes(jwt, users));

  if (dependencies.billingDocuments) {
    app
      .use(
        createBillingDocumentRoutes(dependencies.billingDocuments, jwt, users),
      )
      .use(createRepairRoutes(dependencies.billingDocuments, jwt, users));
  }
  if (dependencies.clients) {
    app.use(
      createClientRoutes(new ClientService(dependencies.clients), jwt, users),
    );
  }
  if (dependencies.supportRequests || dependencies.billingDocuments) {
    app.use(
      createSupportRoutes(
        dependencies.supportRequests ?? new DrizzleSupportRequestRepository(),
        dependencies.supportNotifier ?? new DiscordSupportNotifier(),
        jwt,
        users,
      ),
    );
  }

  return app.get("/", () => "Hello Elysia");
}
