import type {
  DataProtector,
  FieldProtector,
} from "../../../shared/crypto/DataProtector";

const SEARCHABLE_FIELDS = [
  "firstname",
  "lastname",
  "email",
  "phonenumber",
  "addressComplement",
  "companyName",
] as const;

export interface ClientPersonalData {
  firstname: string;
  lastname: string;
  email: string;
  phonenumber: string;
  address: string | null;
  addressComplement: string | null;
  identityCardNumber: string | null;
  privatenote: string | null;
  isProfessional: boolean;
  siret: string | null;
  companyName: string | null;
}

export interface ClientEncryptionRow extends ClientPersonalData {
  id: number;
  encryptionSalt: string | null;
}

export function normalizeClientSearch(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function clientSearchNgrams(value: string): string[] {
  const characters = [...normalizeClientSearch(value)];
  const ngrams = new Set<string>();

  for (let size = 1; size <= Math.min(3, characters.length); size += 1) {
    for (let start = 0; start <= characters.length - size; start += 1) {
      ngrams.add(characters.slice(start, start + size).join(""));
    }
  }

  return [...ngrams];
}

function clientSearchTrigrams(value: string): string[] {
  const characters = [...normalizeClientSearch(value)];
  const trigrams = new Set<string>();

  for (let start = 0; start <= characters.length - 3; start += 1) {
    trigrams.add(characters.slice(start, start + 3).join(""));
  }

  return [...trigrams];
}

export function searchTokensForValues(
  protector: DataProtector,
  values: readonly string[],
): string[] {
  const ngrams = new Set(values.flatMap(clientSearchNgrams));
  return [...ngrams].map((ngram) => protector.searchToken(ngram));
}

export function searchTokensForSearch(
  protector: DataProtector,
  value: string,
): string[] {
  const ngrams = value.split(/\s+/u).flatMap((part) => {
    const normalized = normalizeClientSearch(part);
    return [...normalized].length >= 3
      ? clientSearchTrigrams(normalized)
      : clientSearchNgrams(normalized);
  });
  return [...new Set(ngrams)].map((ngram) => protector.searchToken(ngram));
}

export function searchableValues(data: ClientPersonalData): string[] {
  return SEARCHABLE_FIELDS.map((field) => data[field] ?? "");
}

export function decryptClient(
  protector: DataProtector,
  row: ClientEncryptionRow,
  fieldProtector?: FieldProtector,
): ClientPersonalData & { id: number } {
  if (!row.encryptionSalt) {
    throw new Error(`Client ${row.id} has not been encrypted`);
  }

  const cipher =
    fieldProtector ??
    protector.createFieldProtector(
      Buffer.from(row.encryptionSalt, "base64url"),
    );

  return {
    id: row.id,
    firstname: decryptRequired(row.firstname, cipher),
    lastname: decryptRequired(row.lastname, cipher),
    email: decryptRequired(row.email, cipher),
    phonenumber: decryptRequired(row.phonenumber, cipher),
    address: cipher.decrypt(row.address),
    addressComplement: cipher.decrypt(row.addressComplement),
    identityCardNumber: cipher.decrypt(row.identityCardNumber),
    privatenote: cipher.decrypt(row.privatenote),
    isProfessional: row.isProfessional,
    siret: cipher.decrypt(row.siret),
    companyName: cipher.decrypt(row.companyName),
  };
}

export function decryptClientIdentity(
  protector: DataProtector,
  row: Pick<
    ClientEncryptionRow,
    "id" | "encryptionSalt" | "firstname" | "lastname" | "email"
  >,
): Pick<ClientPersonalData, "firstname" | "lastname" | "email"> {
  if (!row.encryptionSalt) {
    throw new Error(`Client ${row.id} has not been encrypted`);
  }
  const cipher = protector.createFieldProtector(
    Buffer.from(row.encryptionSalt, "base64url"),
  );
  return {
    firstname: decryptRequired(row.firstname, cipher),
    lastname: decryptRequired(row.lastname, cipher),
    email: decryptRequired(row.email, cipher),
  };
}

function decryptRequired(value: string, fieldProtector: FieldProtector) {
  const decrypted = fieldProtector.decrypt(value);
  if (decrypted === null) {
    throw new Error("A required client field is stored as null");
  }
  return decrypted;
}
