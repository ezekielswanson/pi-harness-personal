import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getWorkspaceRoot } from "./paths.ts";

/** dotenv-style VALUE parsing: quotes keep hashes, unquoted values drop an inline comment. */
export function parseEnvValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("'")) {
    const end = trimmed.indexOf("'", 1);
    return end === -1 ? trimmed.slice(1) : trimmed.slice(1, end);
  }
  if (trimmed.startsWith('"')) {
    let out = "";
    for (let index = 1; index < trimmed.length; index += 1) {
      const ch = trimmed[index];
      if (ch === "\\") {
        const next = trimmed[index + 1];
        if (next === "n") out += "\n";
        else if (next === "r") out += "\r";
        else if (next === "t") out += "\t";
        else if (next === undefined) out += "\\";
        else out += next;
        if (next !== undefined) index += 1;
        continue;
      }
      if (ch === '"') return out;
      out += ch;
    }
    return out;
  }
  const comment = trimmed.search(/\s+#/);
  return (comment === -1 ? trimmed : trimmed.slice(0, comment)).trim();
}

export function parseEnvText(text: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const body = line.startsWith("export ") ? line.slice(7).trim() : line;
    const eq = body.indexOf("=");
    if (eq <= 0) continue;
    const key = body.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    parsed[key] = parseEnvValue(body.slice(eq + 1));
  }
  return parsed;
}

export function readEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  return parseEnvText(readFileSync(path, "utf8"));
}

/** Fill unset process.env keys from the workspace .env. Never overrides a key that is already set. Does not log values. */
export function loadRootEnv(workspaceRoot = getWorkspaceRoot()): void {
  const envPath = join(workspaceRoot, ".env");
  if (!existsSync(envPath)) return;
  const parsed = parseEnvText(readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
