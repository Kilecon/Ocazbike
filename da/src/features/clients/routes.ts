import { Elysia, t } from "elysia";
import {
  readAuthUserId,
  requireAdmin,
  requireAuth,
} from "../auth/authorization";
import type { JwtService } from "../auth/jwt";
import type { UserRepository } from "../auth/repositories";
import type { ClientService } from "./service";

const clientFields = {
  firstname: t.String({ minLength: 1 }),
  lastname: t.String({ minLength: 1 }),
  email: t.Optional(
    t.Union([t.String({ format: "email" }), t.Literal(""), t.Null()]),
  ),
  phonenumber: t.Optional(t.Union([t.String(), t.Null()])),
  address: t.Optional(t.String()),
  addressComplement: t.Optional(t.String()),
  identityCardNumber: t.Optional(t.Union([t.String(), t.Null()])),
  privatenote: t.Optional(t.String()),
};

const individualClient = {
  ...clientFields,
  isProfessional: t.Optional(t.Literal(false)),
  siret: t.Optional(t.Null()),
  companyName: t.Optional(t.Null()),
};

const professionalClient = {
  ...clientFields,
  isProfessional: t.Literal(true),
  siret: t.Optional(t.Union([t.String(), t.Null()])),
  companyName: t.Optional(t.Union([t.String(), t.Null()])),
};

const clientBody = t.Union([
  t.Object({ ...individualClient, email: t.String({ format: "email" }) }),
  t.Object({ ...individualClient, phonenumber: t.String({ pattern: "\\S" }) }),
  t.Object({ ...professionalClient, email: t.String({ format: "email" }) }),
  t.Object({
    ...professionalClient,
    phonenumber: t.String({ pattern: "\\S" }),
  }),
]);

export function createClientRoutes(
  service: ClientService,
  jwt: JwtService,
  users: UserRepository,
) {
  return new Elysia({ prefix: "/clients" })
    .post(
      "/",
      async ({ body, request, set }) => {
        const client = await service.createClient(
          body,
          readAuthUserId(request, jwt),
        );
        set.status = 201;
        return client;
      },
      {
        summary: "Créer un client",
        description:
          "Crée une fiche client. Réservé aux administrateurs et sous-administrateurs authentifiés.",
        tags: ["Clients"],
        beforeHandle: requireAuth(jwt, users),
        body: clientBody,
      },
    )
    .put(
      "/:clientId",
      async ({ body, params, request, set }) => {
        const client = await service.updateClient(
          params.clientId,
          body,
          readAuthUserId(request, jwt),
        );
        if (!client) {
          set.status = 404;
          return { error: "Client not found" };
        }
        return client;
      },
      {
        beforeHandle: requireAdmin(jwt, users),
        params: t.Object({ clientId: t.Numeric({ minimum: 1 }) }),
        body: clientBody,
      },
    )
    .get(
      "/:clientId",
      async ({ params, set }) => {
        const client = await service.getClient(params.clientId);
        if (!client) {
          set.status = 404;
          return { error: "Client not found" };
        }
        return client;
      },
      {
        summary: "Récupérer un client",
        description:
          "Retourne les informations d'un client. Réservé aux utilisateurs authentifiés.",
        tags: ["Clients"],
        beforeHandle: requireAuth(jwt, users),
        params: t.Object({ clientId: t.Numeric({ minimum: 1 }) }),
      },
    )
    .get(
      "/",
      async ({ query }) => {
        return service.listClients({
          page: query.page,
          limit: query.limit,
          search: query.search,
        });
      },
      {
        summary: "Lister les clients",
        description:
          "Liste les clients avec pagination (10 par page par défaut, 50 maximum) et recherche trigramme.",
        tags: ["Clients"],
        beforeHandle: requireAuth(jwt, users),
        query: t.Object({
          page: t.Integer({ minimum: 1, default: 1 }),
          limit: t.Numeric({
            minimum: 1,
            maximum: 50,
            multipleOf: 1,
            default: 10,
          }),
          search: t.Optional(t.String({ maxLength: 50 })),
        }),
      },
    );
}
