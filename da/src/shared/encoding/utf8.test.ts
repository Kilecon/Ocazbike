import { Database } from "bun:sqlite";
import { describe, expect, it } from "bun:test";
import { createApp } from "../../appFactory";
import { loadAuthConfig } from "../../features/auth/config";
import { BcryptPasswordHasher } from "../../features/auth/password";
import { ClientDataProtector } from "../../features/clients/crypto/ClientDataProtector";
import { assertWellFormed, decodeUtf8Strict, parseJsonStrict } from "./utf8";

const config = loadAuthConfig({
  JWT_SECRET: "u".repeat(32),
  SPA_APP_ID: "utf8-spa",
});
const app = createApp(config, {
  users: {
    async findByEmail() {
      return null;
    },
  } as never,
  sessions: {} as never,
  passwords: new BcryptPasswordHasher(config.bcryptRounds),
  clientDataProtector: new ClientDataProtector(Buffer.alloc(32, 7)),
});

const post = (body: Uint8Array | string, contentType = "application/json") =>
  app.handle(
    new Request("http://localhost/auth/login", {
      method: "POST",
      headers: { "Content-Type": contentType, "X-App-Id": "utf8-spa" },
      body: typeof body === "string" ? body : (body as BodyInit),
    }),
  );
const bytes = (...values: number[]) => new Uint8Array(values);
const prefix = new TextEncoder().encode('{"email":"a@b.fr","password":"');
const suffix = new TextEncoder().encode('"}');
const withPassword = (middle: Uint8Array) =>
  new Uint8Array([...prefix, ...middle, ...suffix]);

describe("strict UTF-8 helpers", () => {
  it("accepts accents, combining marks, non-Latin scripts and emojis", () => {
    for (const text of ["Élodie", "e\u0301", "漢字 Ωμέγα", "🚲👩‍🔧"]) {
      expect(decodeUtf8Strict(new TextEncoder().encode(text))).toBe(text);
    }
  });

  it("rejects truncated, stray-continuation, overlong and forbidden bytes", () => {
    const invalid = [
      bytes(0xe2, 0x82), // truncated 3-byte sequence
      bytes(0x80), // stray continuation byte
      bytes(0xc0, 0xaf), // overlong "/"
      bytes(0xe0, 0x80, 0xaf), // overlong 3-byte
      bytes(0xed, 0xa0, 0x80), // UTF-8 encoded surrogate
      bytes(0xf8, 0x88, 0x80, 0x80, 0x80), // 5-byte form
      bytes(0xff),
    ];
    for (const sample of invalid) {
      expect(() => decodeUtf8Strict(sample)).toThrow("not valid UTF-8");
    }
  });

  it("rejects lone surrogates produced by JSON escapes", () => {
    expect(() => parseJsonStrict('{"a":"\\uD800"}')).toThrow("surrogate");
    expect(() => parseJsonStrict('{"\\uDC00":"x"}')).toThrow("surrogate");
    expect(parseJsonStrict('{"a":"\\uD83D\\uDEB2"}')).toEqual({ a: "🚲" });
    expect(() => assertWellFormed("ok")).not.toThrow();
  });

  it("reports malformed JSON explicitly", () => {
    expect(() => parseJsonStrict("{nope")).toThrow("Malformed JSON");
  });
});

describe("HTTP request validation", () => {
  it("rejects invalid UTF-8 before parsing, with or without charset", async () => {
    for (const contentType of [
      "application/json",
      "application/json; charset=utf-8",
    ]) {
      const response = await post(withPassword(bytes(0xc0, 0xaf)), contentType);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        code: "INVALID_UTF8",
        message: "Request body is not valid UTF-8",
      });
    }
  });

  it("rejects truncated sequences and stray continuation bytes", async () => {
    expect((await post(withPassword(bytes(0xe2, 0x82)))).status).toBe(400);
    expect((await post(withPassword(bytes(0x80)))).status).toBe(400);
  });

  it("rejects escaped lone surrogates with 422", async () => {
    const response = await post('{"email":"a@b.fr","password":"\\uD800"}');
    expect(response.status).toBe(422);
    expect((await response.json()).code).toBe("INVALID_UNICODE");
  });

  it("rejects malformed JSON with 400", async () => {
    const response = await post("{bad");
    expect(response.status).toBe(400);
    expect((await response.json()).code).toBe("INVALID_JSON");
  });

  it("rejects oversized bodies without reading them entirely", async () => {
    const response = await post(
      `{"email":"a@b.fr","password":"${"x".repeat(1_100_000)}"}`,
    );
    expect(response.status).toBe(413);
  });

  it("lets valid bodies through (accents, emojis, no charset)", async () => {
    const response = await post(
      JSON.stringify({
        email: "elodie@exemple.fr",
        password: "mot-de-passe-🚲",
      }),
    );
    expect(response.status).toBe(401);
  });

  it("accepts an empty JSON body on optional-body routes", async () => {
    const response = await app.handle(
      new Request("http://localhost/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-App-Id": "utf8-spa" },
      }),
    );
    expect(response.status).toBe(401);
  });
});

describe("HTTP responses", () => {
  it("declares UTF-8 on error and success JSON", async () => {
    const error = await post(
      JSON.stringify({ email: "a@b.fr", password: "x" }),
    );
    expect(error.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );

    const health = await app.handle(new Request("http://localhost/health"));
    expect(health.headers.get("content-type")).toBe(
      "application/json; charset=utf-8",
    );
  });

  it("emits exact UTF-8 bytes for non-ASCII content", async () => {
    const response = await app.handle(new Request("http://localhost/health"));
    const raw = new Uint8Array(await response.arrayBuffer());
    expect(() => decodeUtf8Strict(raw)).not.toThrow();
  });
});

describe("encryption and storage round trip", () => {
  const protector = new ClientDataProtector(Buffer.alloc(32, 9));
  const samples = ["Élodie Dupont", "e\u0301", "Ωμέγα 漢字", "🚲👩‍🔧", ""];

  it("restores the exact plaintext after encrypt → SQLite → decrypt", () => {
    const db = new Database(":memory:");
    expect(db.query("PRAGMA encoding").get()).toEqual({ encoding: "UTF-8" });
    db.exec("CREATE TABLE t (id INTEGER PRIMARY KEY, plain TEXT, secret TEXT)");
    const salt = protector.createSalt();
    samples.forEach((sample, index) => {
      db.query("INSERT INTO t (id, plain, secret) VALUES (?, ?, ?)").run(
        index,
        sample,
        protector.encrypt(sample, salt),
      );
    });
    const rows = db.query("SELECT plain, secret FROM t ORDER BY id").all() as {
      plain: string;
      secret: string;
    }[];
    rows.forEach((row, index) => {
      expect(row.plain).toBe(samples[index]);
      expect(protector.decrypt(row.secret, salt.toString("base64url"))).toBe(
        samples[index],
      );
    });
  });

  it("keeps composed and decomposed forms distinct (no normalization)", () => {
    expect("\u00e9").not.toBe("e\u0301");
    const salt = protector.createSalt();
    const out = protector.decrypt(
      protector.encrypt("e\u0301", salt),
      salt.toString("base64url"),
    );
    expect(out).toBe("e\u0301");
  });

  it("refuses to encrypt text containing lone surrogates", () => {
    expect(() => protector.encrypt("ab\uD800", protector.createSalt())).toThrow(
      "well-formed",
    );
  });

  it("detects tampered ciphertexts and wrong keys", () => {
    const salt = protector.createSalt();
    const encoded = salt.toString("base64url");
    const token = protector.encrypt("secret", salt);
    const parts = token.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => protector.decrypt(parts.join("."), encoded)).toThrow();
    const other = new ClientDataProtector(Buffer.alloc(32, 1));
    expect(() => other.decrypt(token, encoded)).toThrow();
  });

  it("rejects authentic ciphertexts whose plaintext is not UTF-8", () => {
    const salt = protector.createSalt();
    const encryptRaw = (
      protector as unknown as {
        encryptionKey(salt: Buffer): Buffer;
      }
    ).encryptionKey(salt);
    const { createCipheriv } = require("node:crypto");
    const nonce = Buffer.alloc(12, 3);
    const cipher = createCipheriv("aes-256-gcm", encryptRaw, nonce);
    const body = Buffer.concat([
      cipher.update(Buffer.from([0xff, 0xfe, 0xfd])),
      cipher.final(),
    ]);
    const token = [
      "v1",
      nonce.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      body.toString("base64url"),
    ].join(".");
    expect(() => protector.decrypt(token, salt.toString("base64url"))).toThrow(
      "not valid UTF-8",
    );
  });
});
