import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, cp } from "fs/promises";
import { existsSync } from "fs";

/**
 * Server dependencies to bundle into the final output.
 * Everything else stays as external imports and is resolved at runtime.
 */
const allowlist = [
  "bcryptjs",
  "connect-pg-simple",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-session",
  "memorystore",
  "nanoid",
  "openai",
  "p-limit",
  "p-retry",
  "passport",
  "passport-local",
  "pg",
  "ws",
  "zod",
  "zod-validation-error",
];

async function buildAll() {
  console.log("🧹 Cleaning dist/...");
  await rm("dist", { recursive: true, force: true });

  console.log("📦 Building client (Vite)...");
  await viteBuild();

  console.log("🔨 Building server (esbuild → ESM)...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    target: "node20",
    bundle: true,
    format: "esm",
    outfile: "dist/index.js",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    // Help esbuild resolve package.json "imports"-style requires in bundled deps
    banner: {
      js: "import { createRequire as _createRequire } from 'node:module'; const require = _createRequire(import.meta.url);",
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Copy attached_assets so @assets imports work in production
  if (existsSync("attached_assets")) {
    console.log("📁 Copying attached_assets...");
    await cp("attached_assets", "dist/attached_assets", { recursive: true });
  }

  console.log("✅ Build complete!");
  console.log("   Client: dist/public/");
  console.log("   Server: dist/index.js");
}

buildAll().catch((err) => {
  console.error("❌ Build failed:", err);
  process.exit(1);
});
