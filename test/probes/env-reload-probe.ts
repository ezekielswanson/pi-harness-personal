import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { loadRootEnv } from "../../src/config/loadEnv.ts";

const root = mkdtempSync(join(tmpdir(), "pi-personal-env-"));
const key = "PERSONAL_ENV_PROBE";
delete process.env[key];
writeFileSync(join(root, ".env"), `${key}=probe-value\n`);
loadRootEnv(root);
if (process.env[key] !== "probe-value") {
  console.error("unset key did not load");
  process.exit(2);
}

process.env[key] = "already-set";
writeFileSync(join(root, ".env"), `${key}=next-value\nPERSONAL_ENV_NEW=fresh-value\n`);
loadRootEnv(root);
if (process.env[key] !== "already-set" || process.env.PERSONAL_ENV_NEW !== "fresh-value") {
  console.error("reload changed a set key or missed an unset key");
  process.exit(3);
}

const stamp = Date.now();
const fresh = await import(`${pathToFileURL(join(process.cwd(), "src/config/loadEnv.ts")).href}?reload=${stamp}`);
fresh.loadRootEnv(root);
if (process.env[key] !== "already-set") {
  console.error("fresh module overrode a set key");
  process.exit(4);
}
console.log("ok");
