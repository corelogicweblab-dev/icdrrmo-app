import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const adminRoot = join(scriptDir, "..");
const nextBin = join(adminRoot, "node_modules", "next", "dist", "bin", "next");

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const text = readFileSync(filePath, "utf8");
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function isAbsoluteHttpUrl(u) {
  return typeof u === "string" && /^https?:\/\//i.test(u) && !u.startsWith("/");
}

const deployFile = join(adminRoot, ".env.deploy");
const fromFile = parseEnvFile(deployFile);

const buildId =
  process.env.NEXT_PUBLIC_WEB_BUILD_ID?.trim() ||
  process.env.GITHUB_SHA?.trim() ||
  `local-${Date.now()}`;

const childEnv = {
  ...process.env,
  NODE_ENV: "production",
  STATIC_EXPORT: "1",
  NEXT_PUBLIC_WEB_BUILD_ID: buildId,
  ...fromFile,
};

const api = childEnv.NEXT_PUBLIC_API_URL?.trim() ?? "";
const ws = childEnv.NEXT_PUBLIC_WS_URL?.trim() ?? "";

if (!isAbsoluteHttpUrl(api)) {
  console.error(
    "Static export needs absolute NEXT_PUBLIC_API_URL (https://your-api-host/api/v1).\n" +
      "Your shell or .env.local may still have /api/v1 — Next would use that and Firebase login would 404.\n" +
      `Set variables in the environment, or create ${deployFile} (see admin/.env.deploy.example).`,
  );
  process.exit(1);
}
if (!isAbsoluteHttpUrl(ws)) {
  console.error(
    "Static export needs absolute NEXT_PUBLIC_WS_URL (https://your-api-host).\n" +
      `Set it in the environment or in ${deployFile} (see admin/.env.deploy.example).`,
  );
  process.exit(1);
}

childEnv.NEXT_PUBLIC_API_URL = api;
childEnv.NEXT_PUBLIC_WS_URL = ws;

const r = spawnSync(process.execPath, [nextBin, "build"], {
  cwd: adminRoot,
  env: childEnv,
  stdio: "inherit",
});
if (r.status !== 0) {
  process.exit(r.status ?? 1);
}

/** Remove source maps from `out/` so Firebase Hosting never uploads them. */
function stripSensitiveArtifacts(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    try {
      const st = statSync(p);
      if (st.isDirectory()) stripSensitiveArtifacts(p);
      else if (name.endsWith(".map")) unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
}
stripSensitiveArtifacts(join(adminRoot, "out"));
process.exit(0);
