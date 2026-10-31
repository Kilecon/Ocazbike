import type { StoreInformation } from "./model";

export interface IStoreInformationRepository {
  get(): Promise<StoreInformation>;
  update(information: StoreInformation): Promise<StoreInformation>;
}
