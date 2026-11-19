import { chmodSync, copyFileSync, mkdirSync, statSync } from "node:fs";

const sourceDirectory = "/run/secret-files";
const targetDirectory = "/run/secrets";
const requiredSecrets = [
  "jwt_secret",
  "bootstrap_admin_password",
  "encryption_key",
];
const optionalSecrets = [
  "discord_webhook_url",
  "store_information_initial_data",
];

mkdirSync(targetDirectory, { mode: 0o700, recursive: true });
chmodSync(targetDirectory, 0o700);

for (const name of [...requiredSecrets, ...optionalSecrets]) {
  const source = `${sourceDirectory}/${name}`;
  const target = `${targetDirectory}/${name}`;
  if (requiredSecrets.includes(name) && statSync(source).size === 0) {
    throw new Error(`Required release secret is empty: ${name}`);
  }

  copyFileSync(source, target);
  chmodSync(target, 0o600);
}

await import("./src/server");
