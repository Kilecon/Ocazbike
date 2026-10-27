import { Elysia, t } from "elysia";
import { logger } from "../../shared/observability/logger";
import { readAuthUserId, requireAdmin } from "../auth/authorization";
import type { JwtService } from "../auth/jwt";
import type { UserRepository } from "../auth/repositories";
import type {
  ISupportRequestRepository,
  SupportNotifier,
  SupportRequestRecord,
} from "./ISupportRequestRepository";

async function sendNotification(
  repository: ISupportRequestRepository,
  notifier: SupportNotifier,
  request: SupportRequestRecord,
) {
  try {
    await notifier.notify(request);
  } catch (error) {
    const updated = await repository.completeNotification(
      request.id,
      "failed",
      new Date(),
    );
    const { createdByUserId: _createdByUserId, ...response } = updated;
    logger.error(
      {
        event: "support_request.discord_notification_failed",
        reference: request.reference,
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
      "Support request Discord notification failed",
    );
    return { ...response, discordNotification: "failed" as const };
  }

  const updated = await repository.completeNotification(
    request.id,
    "sent",
    new Date(),
  );
  const { createdByUserId: _createdByUserId, ...response } = updated;
  return { ...response, discordNotification: "sent" as const };
}

export function createSupportRoutes(
  repository: ISupportRequestRepository,
  notifier: SupportNotifier,
  jwt: JwtService,
  users: UserRepository,
) {
  return new Elysia({ prefix: "/support" })
    .get(
      "/",
      ({ query }) =>
        repository.listPage({
          page: query.page,
          limit: query.limit,
          type: query.type,
          status: query.status,
        }),
      {
        summary: "Lister les demandes de support",
        description:
          "Liste les demandes de support avec pagination et filtres facultatifs par type et statut (Admin seulement).",
        tags: ["Support", "Admin"],
        query: t.Object({
          page: t.Integer({ minimum: 1, default: 1 }),
          limit: t.Integer({ minimum: 1, maximum: 50, default: 10 }),
          type: t.Optional(
            t.Union([t.Literal("SR"), t.Literal("INC"), t.Literal("BUG")]),
          ),
          status: t.Optional(
            t.Union([
              t.Literal("created"),
              t.Literal("pending"),
              t.Literal("closed"),
            ]),
          ),
        }),
        beforeHandle: requireAdmin(jwt, users),
      },
    )
    .post(
      "/",
      async ({ body, request, set }) => {
        const userId = readAuthUserId(request, jwt);
        const supportRequest = await repository.create({
          ...body,
          createdByUserId: userId,
        });
        set.status = 201;
        logger.info(
          {
            event: "support_request.created",
            reference: supportRequest.reference,
            type: supportRequest.type,
            actorId: userId,
          },
          "Support request created",
        );
        const claim = await repository.claimNotification(
          supportRequest.id,
          new Date(),
        );
        if (!claim.claimed) {
          throw new Error(
            `Could not claim Discord notification for request ${supportRequest.id}`,
          );
        }
        return sendNotification(repository, notifier, claim.request);
      },
      {
        beforeHandle: requireAdmin(jwt, users),
        body: t.Object({
          type: t.Union([t.Literal("SR"), t.Literal("INC"), t.Literal("BUG")]),
          title: t.String({ minLength: 1, maxLength: 200 }),
          description: t.String({ minLength: 1, maxLength: 5000 }),
        }),
      },
    )
    .post(
      "/:id/notification",
      async ({ params, set }) => {
        const claim = await repository.claimNotification(params.id, new Date());
        if (!claim.claimed) {
          if (claim.reason === "not_found") {
            set.status = 404;
            return {
              code: "SUPPORT_REQUEST_NOT_FOUND",
              message: "Support request not found.",
            };
          }
          if (claim.reason === "cooldown") {
            set.status = 429;
            return {
              code: "SUPPORT_NOTIFICATION_COOLDOWN",
              message:
                "This request was already notified in the last 24 hours.",
              retryAt: claim.retryAt,
            };
          }
          if (claim.reason === "closed") {
            set.status = 409;
            return {
              code: "SUPPORT_REQUEST_CLOSED",
              message: "Notifications cannot be sent for a closed request.",
            };
          }
          set.status = 409;
          return {
            code: "SUPPORT_NOTIFICATION_IN_PROGRESS",
            message: "A notification is already being sent for this request.",
            retryAt: claim.retryAt,
          };
        }
        return sendNotification(repository, notifier, claim.request);
      },
      {
        summary: "Renvoyer une notification de support",
        description:
          "Réessaie après un échec ou renvoie une notification si la précédente date d'au moins 24 heures (Admin seulement).",
        tags: ["Support", "Admin"],
        params: t.Object({ id: t.Integer({ minimum: 1 }) }),
        beforeHandle: requireAdmin(jwt, users),
      },
    );
}
