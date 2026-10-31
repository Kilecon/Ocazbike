import { request } from "../../services/api-client";
import type { StoreInformation } from "./types";

export function getStoreInformation(): Promise<StoreInformation> {
  return request<StoreInformation>("/store-information");
}

export function updateStoreInformation(
  information: StoreInformation,
): Promise<StoreInformation> {
  return request<StoreInformation>("/store-information", {
    method: "PUT",
    body: JSON.stringify(information),
  });
}
