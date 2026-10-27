import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";

const ENCRYPTION_KEY_PATTERN = /^[\da-f]{64}$/i;
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

export interface ClientFieldProtector {
  encrypt(value: string | null): string | null;
  decrypt(value: string | null): string | null;
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

export class ClientDataProtector {
  private readonly searchKey: Buffer;
  private readonly masterKey: Buffer;
  private readonly emailLookupKey: Buffer;

  constructor(masterKey: Buffer) {
    if (masterKey.length !== 32) {
      throw new Error("ENCRYPTION_KEY must be exactly 32 bytes");
    }

    this.masterKey = Buffer.from(masterKey);
    this.emailLookupKey = Buffer.from(
      hkdfSync(
        "sha256",
        this.masterKey,
        Buffer.from("user-email-lookup-salt-v1"),
        Buffer.from("user-email-lookup-key-v1"),
        32,
      ),
    );
    this.searchKey = Buffer.from(
      hkdfSync(
        "sha256",
        this.masterKey,
        Buffer.from("client-search-index-salt-v1"),
        Buffer.from("client-search-index-key-v1"),
        32,
      ),
    );
  }

  static fromEnvironment(
    value = process.env.ENCRYPTION_KEY,
  ): ClientDataProtector {
    if (!value || !ENCRYPTION_KEY_PATTERN.test(value)) {
      throw new Error(
        "ENCRYPTION_KEY must be set to 64 hexadecimal characters (32 random bytes)",
      );
    }

    return new ClientDataProtector(Buffer.from(value, "hex"));
  }

  createSalt(): Buffer {
    return randomBytes(32);
  }

  encrypt(value: string, salt: Buffer): string;
  encrypt(value: null, salt: Buffer): null;
  encrypt(value: string | null, salt: Buffer): string | null;
  encrypt(value: string | null, salt: Buffer): string | null {
    if (value === null) return null;
    return this.encryptWithKey(value, this.encryptionKey(salt));
  }

  private encryptWithKey(value: string, key: Buffer): string {
    // Node's "utf8" encoder would silently turn lone surrogates into U+FFFD.
    if (!value.isWellFormed()) {
      throw new Error(
        "Refusing to encrypt text that is not well-formed Unicode",
      );
    }

    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    const ciphertext = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);

    return [
      "v1",
      nonce.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(".");
  }

  decrypt(value: string | null, encodedSalt: string | null): string | null {
    if (value === null) return null;
    if (!encodedSalt) {
      throw new Error("Cannot decrypt client data without its encryption salt");
    }
    return this.decryptWithKey(
      value,
      this.encryptionKey(Buffer.from(encodedSalt, "base64url")),
    );
  }

  private decryptWithKey(value: string, key: Buffer): string {
    const [version, encodedNonce, encodedTag, encodedCiphertext, ...extra] =
      value.split(".");
    if (
      version !== "v1" ||
      !encodedNonce ||
      !encodedTag ||
      encodedCiphertext === undefined ||
      extra.length > 0
    ) {
      throw new Error("Client data has an unsupported encryption format");
    }

    const nonce = Buffer.from(encodedNonce, "base64url");
    const tag = Buffer.from(encodedTag, "base64url");
    if (nonce.length !== 12 || tag.length !== 16) {
      throw new Error("Client data has invalid encryption parameters");
    }

    const decipher = createDecipheriv("aes-256-gcm", key, nonce);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(encodedCiphertext, "base64url")),
      decipher.final(),
    ]);
    try {
      return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
        plaintext,
      );
    } catch {
      throw new Error("Decrypted client data is not valid UTF-8");
    }
  }

  emailLookupHash(email: string): string {
    return createHmac("sha256", this.emailLookupKey)
      .update(email.trim().toLowerCase(), "utf8")
      .digest("base64url");
  }

  searchToken(ngram: string): string {
    return createHmac("sha256", this.searchKey)
      .update(ngram, "utf8")
      .digest("base64url");
  }

  searchTokens(value: string): string[] {
    return this.searchTokensForValues([value]);
  }

  searchTokensForSearch(value: string): string[] {
    const normalized = normalizeClientSearch(value);
    const ngrams =
      [...normalized].length >= 3
        ? clientSearchTrigrams(normalized)
        : clientSearchNgrams(normalized);
    return [...new Set(ngrams)].map((ngram) => this.searchToken(ngram));
  }

  searchTokensForValues(values: readonly string[]): string[] {
    const ngrams = new Set(values.flatMap(clientSearchNgrams));
    return [...ngrams].map((ngram) => this.searchToken(ngram));
  }

  searchableValues(data: ClientPersonalData): string[] {
    return SEARCHABLE_FIELDS.map((field) => data[field] ?? "");
  }

  decryptClient<T extends ClientEncryptionRow>(
    row: T,
    fieldProtector?: ClientFieldProtector,
  ): ClientPersonalData & {
    id: number;
  } {
    if (!row.encryptionSalt) {
      throw new Error(`Client ${row.id} has not been encrypted`);
    }

    const cipher =
      fieldProtector ??
      this.createFieldProtector(Buffer.from(row.encryptionSalt, "base64url"));

    return {
      id: row.id,
      firstname: this.decryptRequired(row.firstname, cipher),
      lastname: this.decryptRequired(row.lastname, cipher),
      email: this.decryptRequired(row.email, cipher),
      phonenumber: this.decryptRequired(row.phonenumber, cipher),
      address: cipher.decrypt(row.address),
      addressComplement: cipher.decrypt(row.addressComplement),
      identityCardNumber: cipher.decrypt(row.identityCardNumber),
      privatenote: cipher.decrypt(row.privatenote),
      isProfessional: row.isProfessional,
      siret: cipher.decrypt(row.siret),
      companyName: cipher.decrypt(row.companyName),
    };
  }

  createFieldProtector(salt: Buffer): ClientFieldProtector {
    const key = this.encryptionKey(salt);
    return {
      encrypt: (value) =>
        value === null ? null : this.encryptWithKey(value, key),
      decrypt: (value) =>
        value === null ? null : this.decryptWithKey(value, key),
    };
  }

  private encryptionKey(salt: Buffer): Buffer {
    if (salt.length !== 32) {
      throw new Error("Client data has an invalid encryption salt");
    }

    return Buffer.from(
      hkdfSync(
        "sha256",
        this.masterKey,
        salt,
        Buffer.from("client-data-encryption-v1"),
        32,
      ),
    );
  }

  private decryptRequired(
    value: string,
    fieldProtector: ClientFieldProtector,
  ): string {
    const decrypted = fieldProtector.decrypt(value);
    if (decrypted === null) {
      throw new Error("A required client field is stored as null");
    }
    return decrypted;
  }
}
