import { request } from "@/shared/api/http";
import type { StoreInformation } from "./types";

export function getStoreInformation(
  signal?: AbortSignal,
): Promise<StoreInformation> {
  return request<StoreInformation>("/store-information", { signal });
}

export function updateStoreInformation(
  information: StoreInformation,
): Promise<StoreInformation> {
  return request<StoreInformation>("/store-information", {
    method: "PUT",
    body: JSON.stringify(information),
  });
}
