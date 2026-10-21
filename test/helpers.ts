import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export function tempWorkspace(): string {
  const root = mkdtempSync(join(tmpdir(), "pi-personal-"));
  mkdirSync(join(root, ".pi"), { recursive: true });
  writeFileSync(
    join(root, ".pi", "personal.json"),
    `${JSON.stringify({ vault: { parentPageId: "", aboutMePageId: "", memoriesDbId: "", skillsDbId: "", workstreamsPageId: "" } }, null, 2)}\n`,
  );
  return root;
}

export function removeRepo(root: string): void {
  rmSync(root, { recursive: true, force: true });
}

export async function withEnv<T>(updates: Record<string, string | undefined>, fn: () => Promise<T> | T): Promise<T> {
  const previous = new Map<string, string | undefined>();
  for (const key of Object.keys(updates)) previous.set(key, process.env[key]);
  try {
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    return await fn();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}
