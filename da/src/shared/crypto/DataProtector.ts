import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from "node:crypto";

const ENCRYPTION_KEY_PATTERN = /^[\da-f]{64}$/i;
const DERIVED_KEY_CACHE_SIZE = 1_000;

export interface FieldProtector {
  encrypt(value: string): string;
  encrypt(value: null): null;
  encrypt(value: string | null): string | null;
  decrypt(value: string): string;
  decrypt(value: null): null;
  decrypt(value: string | null): string | null;
}

/**
 * AES-256-GCM encryption with one HKDF-derived key per record salt, plus
 * HMAC-based deterministic tokens for lookups and search.
 */
export class DataProtector {
  private readonly searchKey: Buffer;
  private readonly masterKey: Buffer;
  private readonly emailLookupKey: Buffer;
  private readonly derivedKeys = new Map<string, Buffer>();

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

  static fromEnvironment(value = process.env.ENCRYPTION_KEY): DataProtector {
    if (!value || !ENCRYPTION_KEY_PATTERN.test(value)) {
      throw new Error(
        "ENCRYPTION_KEY must be set to 64 hexadecimal characters (32 random bytes)",
      );
    }

    return new DataProtector(Buffer.from(value, "hex"));
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

  decrypt(value: string | null, encodedSalt: string | null): string | null {
    if (value === null) return null;
    if (!encodedSalt) {
      throw new Error("Cannot decrypt data without its encryption salt");
    }
    return this.decryptWithKey(
      value,
      this.encryptionKey(Buffer.from(encodedSalt, "base64url")),
    );
  }

  createFieldProtector(salt: Buffer): FieldProtector {
    const key = this.encryptionKey(salt);
    const encrypt = (value: string | null) =>
      value === null ? null : this.encryptWithKey(value, key);
    const decrypt = (value: string | null) =>
      value === null ? null : this.decryptWithKey(value, key);
    return { encrypt, decrypt } as FieldProtector;
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
      throw new Error("Encrypted data has an unsupported encryption format");
    }

    const nonce = Buffer.from(encodedNonce, "base64url");
    const tag = Buffer.from(encodedTag, "base64url");
    if (nonce.length !== 12 || tag.length !== 16) {
      throw new Error("Encrypted data has invalid encryption parameters");
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
      throw new Error("Decrypted data is not valid UTF-8");
    }
  }

  private encryptionKey(salt: Buffer): Buffer {
    if (salt.length !== 32) {
      throw new Error("Encrypted data has an invalid encryption salt");
    }

    const cacheKey = salt.toString("base64url");
    const cached = this.derivedKeys.get(cacheKey);
    if (cached) {
      // Re-insert to keep the most recently used keys at the end.
      this.derivedKeys.delete(cacheKey);
      this.derivedKeys.set(cacheKey, cached);
      return cached;
    }

    // The "client-data" info label is kept for compatibility with stored data.
    const key = Buffer.from(
      hkdfSync(
        "sha256",
        this.masterKey,
        salt,
        Buffer.from("client-data-encryption-v1"),
        32,
      ),
    );
    this.derivedKeys.set(cacheKey, key);
    if (this.derivedKeys.size > DERIVED_KEY_CACHE_SIZE) {
      const oldest = this.derivedKeys.keys().next().value;
      if (oldest !== undefined) this.derivedKeys.delete(oldest);
    }
    return key;
  }
}
