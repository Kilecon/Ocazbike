import { eq } from "drizzle-orm";
import type { DataProtector } from "../../../shared/crypto/DataProtector";
import type { AppDatabase } from "../../../shared/database/db";
import { storeInformation as storeInformationTable } from "../../../shared/database/schema/storeInformation";
import type { IStoreInformationRepository } from "../IStoreInformationRepository";
import {
  EMPTY_STORE_INFORMATION,
  normalizeStoreInformation,
  STORE_INFORMATION_ID,
  type StoreInformation,
} from "../model";

export class DrizzleStoreInformationRepository
  implements IStoreInformationRepository
{
  constructor(
    private readonly database: AppDatabase,
    private readonly protector: DataProtector,
  ) {}

  async get(): Promise<StoreInformation> {
    const [row] = await this.database
      .select()
      .from(storeInformationTable)
      .where(eq(storeInformationTable.id, STORE_INFORMATION_ID))
      .limit(1);

    if (!row) return { ...EMPTY_STORE_INFORMATION };

    const fieldProtector = this.protector.createFieldProtector(
      Buffer.from(row.encryptionSalt, "base64url"),
    );
    const plaintext = fieldProtector.decrypt(row.encryptedPayload);
    if (plaintext === null) {
      throw new Error("Store information payload is unexpectedly empty");
    }

    const parsed: unknown = JSON.parse(plaintext);
    if (!isStoreInformation(parsed)) {
      throw new Error("Stored store information has an invalid shape");
    }
    return parsed;
  }

  async update(information: StoreInformation): Promise<StoreInformation> {
    const normalized = normalizeStoreInformation(information);
    const salt = this.protector.createSalt();
    const encryptedPayload = this.protector
      .createFieldProtector(salt)
      .encrypt(JSON.stringify(normalized));
    const updatedAt = new Date().toISOString();

    await this.database
      .insert(storeInformationTable)
      .values({
        id: STORE_INFORMATION_ID,
        encryptedPayload,
        encryptionSalt: salt.toString("base64url"),
        updatedAt,
      })
      .onConflictDoUpdate({
        target: storeInformationTable.id,
        set: {
          encryptedPayload,
          encryptionSalt: salt.toString("base64url"),
          updatedAt,
        },
      });

    return normalized;
  }
}

function isStoreInformation(value: unknown): value is StoreInformation {
  if (!value || typeof value !== "object") return false;
  return Object.keys(EMPTY_STORE_INFORMATION).every(
    (key) => typeof (value as Record<string, unknown>)[key] === "string",
  );
}
