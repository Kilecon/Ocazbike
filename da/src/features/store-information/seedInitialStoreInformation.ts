import type { DataProtector } from "../../shared/crypto/DataProtector";
import type { AppDatabase } from "../../shared/database/db";
import { storeInformation as storeInformationTable } from "../../shared/database/schema/storeInformation";
import {
  normalizeStoreInformation,
  STORE_INFORMATION_ID,
  type StoreInformation,
} from "./model";

const FIELD_MAX_LENGTHS = [
  ["name", 120],
  ["address", 500],
  ["phone", 40],
  ["email", 254],
  ["siret", 32],
  ["apeCode", 20],
  ["vatNumber", 32],
  ["bankName", 120],
  ["iban", 64],
  ["bic", 32],
] as const satisfies readonly (readonly [keyof StoreInformation, number])[];

export async function seedInitialStoreInformation(
  database: AppDatabase,
  protector: DataProtector,
  payload: string | undefined,
): Promise<void> {
  if (!payload?.trim()) return;

  const information = parseInitialStoreInformation(payload);
  const salt = protector.createSalt();

  await database
    .insert(storeInformationTable)
    .values({
      id: STORE_INFORMATION_ID,
      encryptedPayload: protector
        .createFieldProtector(salt)
        .encrypt(JSON.stringify(information)),
      encryptionSalt: salt.toString("base64url"),
      updatedAt: new Date().toISOString(),
    })
    .onConflictDoNothing({ target: storeInformationTable.id });
}

function parseInitialStoreInformation(payload: string): StoreInformation {
  let value: unknown;
  try {
    value = JSON.parse(payload);
  } catch {
    throw new Error("STORE_INFORMATION_INITIAL_DATA must be valid JSON");
  }

  if (!isRecord(value)) {
    throw new Error("STORE_INFORMATION_INITIAL_DATA must be a JSON object");
  }

  const information = {
    name: readString(value, "name"),
    address: readString(value, "address"),
    phone: readString(value, "phone"),
    email: readString(value, "email"),
    siret: readString(value, "siret"),
    apeCode: readString(value, "apeCode"),
    vatNumber: readString(value, "vatNumber"),
    bankName: readString(value, "bankName"),
    iban: readString(value, "iban"),
    bic: readString(value, "bic"),
  };
  const normalized = normalizeStoreInformation({
    name: emptyIfDash(information.name),
    address: emptyIfDash(information.address),
    phone: emptyIfDash(information.phone),
    email: emptyIfDash(information.email),
    siret: emptyIfDash(information.siret),
    apeCode: emptyIfDash(information.apeCode),
    vatNumber: emptyIfDash(information.vatNumber),
    bankName: emptyIfDash(information.bankName),
    iban: emptyIfDash(information.iban),
    bic: emptyIfDash(information.bic),
  });

  for (const [field, maxLength] of FIELD_MAX_LENGTHS) {
    if (normalized[field].length > maxLength) {
      throw new Error(
        `STORE_INFORMATION_INITIAL_DATA field "${field}" exceeds ${maxLength} characters`,
      );
    }
  }

  if (
    normalized.email &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized.email)
  ) {
    throw new Error(
      'STORE_INFORMATION_INITIAL_DATA field "email" must be a valid email address',
    );
  }

  return normalized;
}

function emptyIfDash(value: string): string {
  return value === "-" ? "" : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: Record<string, unknown>, key: string): string {
  const field = value[key];
  if (typeof field !== "string") {
    throw new Error(
      `STORE_INFORMATION_INITIAL_DATA field "${key}" must be a string`,
    );
  }
  return field;
}
