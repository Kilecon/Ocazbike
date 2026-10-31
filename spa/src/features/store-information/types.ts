export interface StoreInformation {
  name: string;
  address: string;
  phone: string;
  email: string;
  siret: string;
  apeCode: string;
  vatNumber: string;
  bankName: string;
  iban: string;
  bic: string;
}

export const EMPTY_STORE_INFORMATION: StoreInformation = {
  name: "",
  address: "",
  phone: "",
  email: "",
  siret: "",
  apeCode: "",
  vatNumber: "",
  bankName: "",
  iban: "",
  bic: "",
};
