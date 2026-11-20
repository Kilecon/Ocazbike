import { Elysia } from "elysia";
import { requireAdmin } from "../auth/authorization";
import type { IUserRepository } from "../auth/IAuthRepositories";
import type { JwtService } from "../auth/jwt";
import type { IStoreInformationRepository } from "./IStoreInformationRepository";
import { storeInformationBody } from "./model";

export function createStoreInformationRoutes(
  repository: IStoreInformationRepository,
  jwt: JwtService,
  users: IUserRepository,
) {
  return new Elysia({ prefix: "/store-information" })
    .get("/", () => repository.get(), {
      detail: {
        summary: "Récupérer les informations du magasin",
        tags: ["Store information", "Admin"],
      },
      beforeHandle: requireAdmin(jwt, users),
    })
    .put("/", ({ body }) => repository.update(body), {
      detail: {
        summary: "Mettre à jour les informations du magasin",
        tags: ["Store information", "Admin"],
      },
      body: storeInformationBody,
      beforeHandle: requireAdmin(jwt, users),
    });
}
