import { rmSync } from "node:fs";
import path from "node:path";

const outdir = path.resolve(import.meta.dir, "dist");
rmSync(outdir, { recursive: true, force: true });

const result = await Bun.build({
  entrypoints: [path.resolve(import.meta.dir, "src/index.html")],
  outdir,
  minify: true,
  splitting: true,
  target: "browser",
  publicPath: "/",
  sourcemap: process.argv.includes("--no-sourcemap") ? "none" : "linked",
  env: "BUN_PUBLIC_*",
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

for (const output of result.outputs) {
  console.log(
    ` ${path.relative(process.cwd(), output.path)}  ${(output.size / 1024).toFixed(1)} KB`,
  );
}
