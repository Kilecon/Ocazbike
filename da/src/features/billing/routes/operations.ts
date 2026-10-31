import { Elysia, t } from "elysia";
import { requireAuth } from "../../auth/authorization";
import type { IUserRepository } from "../../auth/IAuthRepositories";
import type { JwtService } from "../../auth/jwt";
import {
  BILLING_DOCUMENT_STATUSES,
  BILLING_DOCUMENT_TYPES,
  BILLING_PAYMENT_METHODS,
  BillingOperationInputError,
  BillingWorkflowConflictError,
  type IBillingDocumentRepository,
} from "../IBillingDocumentRepository";

const datePattern =
  "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(Z|[+-]\\d{2}:\\d{2})$";
const lineSchema = t.Object({
  description: t.String({ minLength: 1 }),
  quantity: t.String({ pattern: "^\\d+(\\.\\d{1,3})?$" }),
  unitPrice: t.String({ pattern: "^-?\\d+(\\.\\d{1,2})?$" }),
  vatRate: t.String({ pattern: "^\\d+(\\.\\d{1,2})?$" }),
  discount: t.Optional(t.String({ pattern: "^\\d+(\\.\\d{1,2})?$" })),
  total: t.String({ pattern: "^-?\\d+(\\.\\d{1,2})?$" }),
});
const operationFields = {
  date: t.String({ pattern: datePattern }),
  comment: t.Optional(t.String()),
  serviceStartAt: t.Optional(t.String({ pattern: datePattern })),
  serviceEndAt: t.Optional(t.String({ pattern: datePattern })),
  lines: t.Optional(t.Array(lineSchema, { maxItems: 100 })),
};
const idParams = t.Object({ id: t.Integer({ minimum: 1 }) });
const typeSchema = t.Union(
  BILLING_DOCUMENT_TYPES.map((type) => t.Literal(type)),
);

function respondWithTransition(
  action: (id: number) => ReturnType<IBillingDocumentRepository["acceptQuote"]>,
) {
  return async ({
    params,
    set,
  }: {
    params: { id: number };
    set: { status?: number | string };
  }) => {
    try {
      const operation = await action(params.id);
      if (!operation) {
        set.status = 404;
        return { code: "OPERATION_NOT_FOUND", message: "Operation not found" };
      }
      return operation;
    } catch (error) {
      if (!(error instanceof BillingWorkflowConflictError)) throw error;
      set.status = 409;
      return { code: "INVALID_OPERATION_TRANSITION", message: error.message };
    }
  };
}

export function createBillingOperationRoutes(
  repository: IBillingDocumentRepository,
  jwt: JwtService,
  users: IUserRepository,
) {
  const authenticated = requireAuth(jwt, users);
  return new Elysia({ prefix: "/operations" })
    .get("/counts", () => repository.countOperations(), {
      beforeHandle: authenticated,
      detail: {
        summary: "Compter les dossiers par type et statut",
        description:
          "Retourne pour repair, sale, purchase et rental les nombres de dossiers pending, in_progress et payment_pending, y compris les compteurs à zéro. Agrégation globale indépendante de la pagination, sans données client ni documents.",
        tags: ["Facturation"],
      },
    })
    .get(
      "/",
      ({ query }) =>
        repository.listOperations({
          clientId: query.clientId,
          type: query.type,
          statuses: query.status
            ? BILLING_DOCUMENT_STATUSES.filter((status) =>
                query.status?.split(",").includes(status),
              )
            : undefined,
          search: query.search,
          page: query.page,
          limit: query.limit,
        }),
      {
        detail: {
          summary: "Lister les dossiers de facturation",
          description:
            "Liste les dossiers paginés sans lignes, avec filtres facultatifs par type et statut. Le client contient uniquement firstname, lastname et email ; les documents sont limités à leurs métadonnées. closedAt est la date de refus du devis ou de paiement de la facture (null sinon). Pour tous les types, les dates de prestation saisies sont prioritaires dans serviceStartAt/serviceEndAt ; à défaut, ces champs reprennent la date du dossier et closedAt. Toutes les dates sont en millisecondes UTC entières. Aucun paymentStatus n'est renvoyé.",
          tags: ["Facturation"],
        },
        beforeHandle: authenticated,
        query: t.Object({
          clientId: t.Optional(t.Integer({ minimum: 1 })),
          type: t.Optional(typeSchema),
          status: t.Optional(
            t.String({
              pattern: `^(${BILLING_DOCUMENT_STATUSES.join("|")})(,(${BILLING_DOCUMENT_STATUSES.join("|")}))*$`,
              maxLength: 150,
            }),
          ),
          search: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
          page: t.Integer({ minimum: 1, default: 1 }),
          limit: t.Integer({ minimum: 1, maximum: 50, default: 20 }),
        }),
      },
    )
    .post(
      "/",
      async ({ body, set }) => {
        if (body.createQuote && !body.lines?.length) {
          set.status = 400;
          return {
            code: "INVALID_QUOTE",
            message: "Creating a quote requires at least one billing line",
          };
        }
        if (
          (body.type === "rental" &&
            (!body.serviceStartAt || !body.serviceEndAt)) ||
          Boolean(body.serviceStartAt) !== Boolean(body.serviceEndAt)
        ) {
          set.status = 400;
          return {
            code: "INVALID_SERVICE_PERIOD",
            message: "A complete service period is required",
          };
        }
        try {
          const operation = await repository.createOperation(body);
          if (!operation) {
            set.status = 404;
            return { code: "CLIENT_NOT_FOUND", message: "Client not found" };
          }
          set.status = 201;
          return operation;
        } catch (error) {
          if (!(error instanceof BillingOperationInputError)) throw error;
          set.status = 400;
          return { code: "INVALID_OPERATION_INPUT", message: error.message };
        }
      },
      {
        detail: {
          summary: "Créer un dossier de facturation",
          description:
            "Crée un dossier avec ses lignes. Une location exige une période prévue complète. Tout dossier sans devis démarre en cours ; createQuote=true génère le devis chiffré et passe en attente. Un devis à 0 EUR est automatiquement accepté et le dossier démarre en cours ; la facture sera créée et réglée automatiquement à la fin du dossier. Les remises sont des lignes à prix et total négatifs ; le total du dossier ne peut pas être négatif.",
          tags: ["Facturation"],
        },
        beforeHandle: authenticated,
        body: t.Object({
          clientId: t.Integer({ minimum: 1 }),
          createQuote: t.Optional(t.Boolean()),
          type: typeSchema,
          ...operationFields,
        }),
      },
    )
    .get(
      "/:id",
      async ({ params, set }) => {
        const operation = await repository.getOperation(params.id);
        if (!operation) {
          set.status = 404;
          return {
            code: "OPERATION_NOT_FOUND",
            message: "Operation not found",
          };
        }
        return operation;
      },
      {
        detail: {
          summary: "Récupérer un dossier de facturation",
          description:
            "Retourne les lignes, les données client et les snapshots devis/facture déchiffrés.",
          tags: ["Facturation"],
        },
        beforeHandle: authenticated,
        params: idParams,
      },
    )
    .post(
      "/:id/accept",
      respondWithTransition((id) => repository.acceptQuote(id)),
      {
        beforeHandle: authenticated,
        params: idParams,
        detail: {
          summary: "Accepter un devis",
          description:
            "Accepte un devis en attente, actualise son statut sans réécrire le JSON et démarre directement le dossier.",
          tags: ["Facturation"],
        },
      },
    )
    .post(
      "/:id/reject",
      respondWithTransition((id) => repository.rejectQuote(id)),
      {
        beforeHandle: authenticated,
        params: idParams,
        detail: {
          summary: "Refuser un devis",
          description: "Refuse un devis en attente et annule le dossier.",
          tags: ["Facturation"],
        },
      },
    )
    .post(
      "/:id/complete",
      respondWithTransition((id) => repository.completeOperation(id)),
      {
        beforeHandle: authenticated,
        params: idParams,
        detail: {
          summary: "Terminer une opération",
          description:
            "Termine un dossier en cours (ou un ancien dossier completed non facturé), avec devis accepté ou sans devis, et crée automatiquement la facture dans la même transaction. Si le montant est non nul, la facture reste à régler et le dossier passe en attente de paiement ; à 0 EUR, la facture est automatiquement réglée. La période prévue de location reste inchangée.",
          tags: ["Facturation"],
        },
      },
    )
    .post(
      "/:id/pay",
      async ({ params, body, set }) => {
        try {
          const operation = await repository.payOperation(
            params.id,
            body.method,
          );
          if (!operation) {
            set.status = 404;
            return {
              code: "OPERATION_NOT_FOUND",
              message: "Operation not found",
            };
          }
          return operation;
        } catch (error) {
          if (!(error instanceof BillingWorkflowConflictError)) throw error;
          set.status = 409;
          return {
            code: "INVALID_OPERATION_TRANSITION",
            message: error.message,
          };
        }
      },
      {
        beforeHandle: authenticated,
        params: idParams,
        body: t.Object({
          method: t.Union(
            BILLING_PAYMENT_METHODS.map((method) => t.Literal(method)),
          ),
        }),
        detail: {
          summary: "Enregistrer un paiement",
          description:
            "Enregistre le mode de paiement d'une facture à régler et marque le dossier payé. Pour un ancien dossier completed non facturé, la facture est créée dans la même transaction.",
          tags: ["Facturation"],
        },
      },
    );
}
