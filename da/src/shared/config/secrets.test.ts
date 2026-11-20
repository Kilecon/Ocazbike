import { afterAll, afterEach, describe, expect, it } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadRuntimeEnvironment } from "./secrets";

const directory = mkdtempSync(join(tmpdir(), "ocazbike-secrets-"));
afterEach(() => {
  for (const name of ["jwt", "encryption", "webhook"]) {
    rmSync(join(directory, name), { force: true });
  }
});
afterAll(() => rmSync(directory, { recursive: true, force: true }));

describe("loadRuntimeEnvironment", () => {
  it("uses the supplied environment outside production", () => {
    const env = { NODE_ENV: "development", JWT_SECRET: "development" };
    expect(loadRuntimeEnvironment(env)).toBe(env);
  });

  it("reads production secrets from files, not secret environment values", () => {
    const jwt = join(directory, "jwt");
    const encryption = join(directory, "encryption");
    const webhook = join(directory, "webhook");
    writeFileSync(jwt, "file-jwt\n");
    writeFileSync(encryption, "file-key");
    writeFileSync(webhook, "");
    const resolved = loadRuntimeEnvironment({
      NODE_ENV: "production",
      JWT_SECRET: "environment-jwt",
      JWT_SECRET_FILE: jwt,
      ENCRYPTION_KEY_FILE: encryption,
      DISCORD_WEBHOOK_URL: "environment-webhook",
      DISCORD_WEBHOOK_URL_FILE: webhook,
      BOOTSTRAP_ADMIN_PASSWORD: "environment-password",
    });
    expect(resolved.JWT_SECRET).toBe("file-jwt");
    expect(resolved.ENCRYPTION_KEY).toBe("file-key");
    expect(resolved.DISCORD_WEBHOOK_URL).toBe("");
    expect(resolved.BOOTSTRAP_ADMIN_PASSWORD).toBeUndefined();
  });

  it("rejects missing paths and unreadable files in production", () => {
    expect(() =>
      loadRuntimeEnvironment({ NODE_ENV: "production", JWT_SECRET: "ignored" }),
    ).toThrow("JWT_SECRET_FILE");
    expect(() =>
      loadRuntimeEnvironment({
        NODE_ENV: "production",
        JWT_SECRET_FILE: join(directory, "missing"),
      }),
    ).toThrow();
  });
});
