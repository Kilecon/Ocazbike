import { Elysia, t } from "elysia";
import { readAuthUserId, requireAdmin, requireAuth } from "./authorization";
import type { AuthConfig } from "./config";
import {
  clearRefreshCookie,
  REFRESH_COOKIE_NAME,
  readCookie,
  refreshCookie,
} from "./cookies";
import { AuthenticationError } from "./errors";
import type { JwtService } from "./jwt";
import type { UserRepository } from "./repositories";
import type { AuthService } from "./service";
import type { AuthTokens } from "./types";

export function authRoutes(
  service: AuthService,
  jwt: JwtService,
  users: UserRepository,
  config: Pick<AuthConfig, "refreshTokenTtlSeconds" | "secureCookies">,
) {
  const withRefreshCookie = (
    set: { headers: Record<string, string | number | undefined> },
    tokens: AuthTokens,
  ) => {
    set.headers["set-cookie"] = refreshCookie(
      tokens.refreshToken,
      config.refreshTokenTtlSeconds,
      config.secureCookies,
    );
    // The refresh token only travels in the HttpOnly cookie.
    const { refreshToken: _refreshToken, ...body } = tokens;
    return body;
  };
  const tokenFrom = (request: Request, bodyToken?: string) =>
    readCookie(request, REFRESH_COOKIE_NAME) ?? bodyToken ?? "";

  const auth = new Elysia({ prefix: "/auth" })
    .post(
      "/login",
      async ({ body, request, server, set }) =>
        withRefreshCookie(
          set,
          await service.login(body.email, body.password, {
            userAgent: request.headers.get("User-Agent") ?? undefined,
            ip: server?.requestIP(request)?.address,
          }),
        ),
      {
        summary: "Connexion utilisateur",
        description:
          "Authentifie un utilisateur avec son email et mot de passe.",
        tags: ["Auth"],
        body: t.Object({
          email: t.String({ format: "email" }),
          password: t.String({ minLength: 1 }),
        }),
      },
    )
    .post(
      "/refresh",
      async ({ body, request, set }) =>
        withRefreshCookie(
          set,
          await service.refresh(tokenFrom(request, body?.refreshToken), {
            userAgent: request.headers.get("User-Agent") ?? undefined,
          }),
        ),
      {
        summary: "Rafraîchir les tokens",
        description:
          "Utilise le refreshToken pour générer un nouveau accessToken.",
        tags: ["Auth"],
        body: t.Optional(
          t.Object({
            refreshToken: t.Optional(t.String({ minLength: 1 })),
          }),
        ),
      },
    )
    .post(
      "/logout",
      async ({ body, request, set }) => {
        try {
          const refreshToken = tokenFrom(request, body?.refreshToken);
          if (refreshToken) await service.logout(refreshToken);
        } catch (error) {
          // An expired or invalid token must still lead to a cleared cookie.
          if (!(error instanceof AuthenticationError)) throw error;
        }
        set.headers["set-cookie"] = clearRefreshCookie(config.secureCookies);
        set.status = 204;
      },
      {
        summary: "Déconnexion utilisateur",
        description: "Invalide la session et supprime le refreshToken.",
        tags: ["Auth"],
        body: t.Optional(
          t.Object({
            refreshToken: t.Optional(t.String({ minLength: 1 })),
          }),
        ),
        beforeHandle: requireAuth(jwt, users),
      },
    )
    .get(
      "/me",
      async ({ request }) => service.me(readAuthUserId(request, jwt)),
      {
        detail: {
          summary: "Récupérer l'utilisateur connecté",
          description:
            "Retourne les informations de l'utilisateur actuellement authentifié.",
          tags: ["Auth"],
        },
        beforeHandle: requireAuth(jwt, users, {
          allowPasswordChangeRequired: true,
        }),
      },
    )
    .post(
      "/change-password",
      async ({ request, body, set }) => {
        await service.changePassword(
          readAuthUserId(request, jwt),
          body.currentPassword,
          body.password,
        );
        set.status = 204;
      },
      {
        summary: "Changer le mot de passe initial",
        description:
          "Permet à un utilisateur de changer son mot de passe initial lors de sa première connexion.",
        tags: ["Auth"],
        body: t.Object({
          currentPassword: t.String({ minLength: 1 }),
          password: t.String({
            description: "Nouveau mot de passe (minimum 12 caractères)",
            examples: ["NewSecurePassword123"],
          }),
        }),
        beforeHandle: requireAuth(jwt, users, {
          allowPasswordChangeRequired: true,
        }),
      },
    );

  return new Elysia()
    .use(auth)
    .get(
      "/users",
      ({ query }) =>
        service.listUsers(query.activeOnly, query.page, query.limit),
      {
        detail: {
          summary: "Lister les utilisateurs",
          description:
            "Liste les utilisateurs avec pagination (10 par page par défaut, 50 maximum), actifs par défaut (Admin seulement).",
          tags: ["Users", "Admin"],
        },
        query: t.Object({
          activeOnly: t.BooleanString({ default: true }),
          page: t.Numeric({ minimum: 1, multipleOf: 1, default: 1 }),
          limit: t.Numeric({
            minimum: 1,
            maximum: 50,
            multipleOf: 1,
            default: 10,
          }),
        }),
        beforeHandle: requireAdmin(jwt, users),
      },
    )
    .post(
      "/users",
      async ({ body, set }) => {
        set.status = 201;
        return service.createUser(body);
      },
      {
        summary: "Créer un nouvel utilisateur",
        description:
          "Crée un nouvel utilisateur avec les informations fournies (Admin seulement).",
        tags: ["Users", "Admin"],
        body: t.Object({
          firstname: t.String(),
          lastname: t.String(),
          email: t.String(),
          password: t.String(),
          role: t.Optional(t.String()),
        }),
        beforeHandle: requireAdmin(jwt, users),
      },
    )
    .patch(
      "/users/:id/deactivate",
      async ({ params, request, set }) => {
        await service.deactivateUser(
          Number(params.id),
          readAuthUserId(request, jwt),
        );
        set.status = 204;
      },
      {
        summary: "Désactiver un utilisateur",
        description:
          "Désactive un utilisateur et invalide toutes ses sessions (Admin seulement).",
        tags: ["Users", "Admin"],
        params: t.Object({
          id: t.Numeric({ minimum: 1 }),
        }),
        beforeHandle: requireAdmin(jwt, users),
      },
    )
    .patch(
      "/users/:id/activate",
      async ({ params, request, set }) => {
        await service.activateUser(
          Number(params.id),
          readAuthUserId(request, jwt),
        );
        set.status = 204;
      },
      {
        summary: "Réactiver un utilisateur",
        description: "Réactive un compte utilisateur (Admin seulement).",
        tags: ["Users", "Admin"],
        params: t.Object({
          id: t.Numeric({ minimum: 1 }),
        }),
        beforeHandle: requireAdmin(jwt, users),
      },
    );
}
