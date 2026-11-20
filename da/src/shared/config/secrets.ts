import { readFileSync } from "node:fs";

type Environment = Record<string, string | undefined>;

const SECRET_NAMES = [
  "JWT_SECRET",
  "ENCRYPTION_KEY",
  "BOOTSTRAP_ADMIN_PASSWORD",
  "DISCORD_WEBHOOK_URL",
  "STORE_INFORMATION_INITIAL_DATA",
] as const;

export function loadRuntimeEnvironment(
  env: Environment = process.env,
): Environment {
  if (env.NODE_ENV !== "production") return env;

  const resolved = { ...env };
  for (const name of SECRET_NAMES) {
    const path = env[`${name}_FILE`];
    delete resolved[name];
    if (path) {
      resolved[name] = readFileSync(path, "utf8").replace(/\r?\n$/, "");
    } else if (name === "JWT_SECRET" || name === "ENCRYPTION_KEY") {
      throw new Error(`${name}_FILE must be set in production`);
    }
  }
  return resolved;
}
