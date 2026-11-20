import { t } from "elysia";

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

export const STORE_INFORMATION_ID = "ocazbike";

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

const optionalEmail = t.Union([
  t.String({ format: "email", maxLength: 254 }),
  t.Literal(""),
]);

export const storeInformationBody = t.Object({
  name: t.String({ maxLength: 120 }),
  address: t.String({ maxLength: 500 }),
  phone: t.String({ maxLength: 40 }),
  email: optionalEmail,
  siret: t.String({ maxLength: 32 }),
  apeCode: t.String({ maxLength: 20 }),
  vatNumber: t.String({ maxLength: 32 }),
  bankName: t.String({ maxLength: 120 }),
  iban: t.String({ maxLength: 64 }),
  bic: t.String({ maxLength: 32 }),
});

export function normalizeStoreInformation(
  information: StoreInformation,
): StoreInformation {
  return {
    name: information.name.trim(),
    address: information.address.trim(),
    phone: information.phone.trim(),
    email: information.email.trim(),
    siret: information.siret.trim(),
    apeCode: information.apeCode.trim(),
    vatNumber: information.vatNumber.trim(),
    bankName: information.bankName.trim(),
    iban: information.iban.trim(),
    bic: information.bic.trim(),
  };
}
