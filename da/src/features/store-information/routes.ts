import { Elysia } from "elysia";
import { requireAdmin } from "../auth/authorization";
import type { IUserRepository } from "../auth/IAuthRepositories";
import type { JwtService } from "../auth/jwt";
import type { IStoreInformationRepository } from "./IStoreInformationRepository";
import { normalizeStoreInformation, storeInformationBody } from "./model";

export function createStoreInformationRoutes(
  repository: IStoreInformationRepository,
  jwt: JwtService,
  users: IUserRepository,
) {
  return new Elysia({ prefix: "/store-information" })
    .onTransform(({ body }) => {
      if (!body || typeof body !== "object" || Array.isArray(body)) return;
      for (const [field, value] of Object.entries(body)) {
        if (typeof value === "string") {
          Object.assign(body, { [field]: value.trim() });
        }
      }
    })
    .get("/", () => repository.get(), {
      detail: {
        summary: "Récupérer les informations du magasin",
        tags: ["Store information", "Admin"],
      },
      beforeHandle: requireAdmin(jwt, users),
    })
    .put(
      "/",
      ({ body }) =>
        repository.update(
          normalizeStoreInformation({
            secondaryPhone: "",
            ...body,
          }),
        ),
      {
        detail: {
          summary: "Mettre à jour les informations du magasin",
          description:
            "Les téléphones sont validés avec libphonenumber-js (France par défaut ou indicatif international) puis formatés. Les téléphones vides restent autorisés.",
          tags: ["Store information", "Admin"],
        },
        body: storeInformationBody,
        beforeHandle: requireAdmin(jwt, users),
      },
    );
}
