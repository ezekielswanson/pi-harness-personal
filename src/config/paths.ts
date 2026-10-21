import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

function hasPersonalConfig(dir: string): boolean {
  return existsSync(join(dir, ".pi", "personal.json"));
}

function walkForRoot(startDir: string): string | null {
  let dir = resolve(startDir);
  while (true) {
    if (hasPersonalConfig(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/** Workspace root: nearest ancestor with .pi/personal.json, else PI_PERSONAL_WORKSPACE, else cwd. */
export function getWorkspaceRoot(start?: string): string {
  const candidates = [start, process.cwd()].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    const found = walkForRoot(candidate);
    if (found) return found;
  }
  const fromEnv = process.env.PI_PERSONAL_WORKSPACE?.trim();
  if (fromEnv) return resolve(fromEnv);
  return resolve(process.cwd());
}
