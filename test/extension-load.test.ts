import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { discoverAndLoadExtensions } from "@earendil-works/pi-coding-agent";

test("Pi 1.3 loads the three personal extensions", async () => {
  const root = JSON.parse(readFileSync(resolve("package.json"), "utf8")) as { pi: { extensions: string[] } };
  const harness = JSON.parse(readFileSync(resolve("packages/pi-personal-harness/package.json"), "utf8")) as {
    pi: { extensions: string[] };
  };
  assert.deepEqual(root.pi.extensions, [
    "./packages/pi-personal-harness/extensions/session.ts",
    "./packages/pi-personal-harness/extensions/vault.ts",
    "./packages/pi-personal-harness/extensions/loop.ts",
  ]);
  assert.deepEqual(harness.pi.extensions, ["./extensions/session.ts", "./extensions/vault.ts", "./extensions/loop.ts"]);
  const paths = root.pi.extensions.map((entry) => resolve(entry));
  const loaded = await discoverAndLoadExtensions(paths, mkdtempSync(join(tmpdir(), "pi-personal-ext-")), mkdtempSync(join(tmpdir(), "pi-personal-agent-")));
  const failures = loaded.errors.filter((error) => paths.some((path) => error.path === path));
  assert.deepEqual(failures, []);
  const ours = loaded.extensions.filter((extension) => paths.includes(extension.path));
  assert.equal(ours.length, paths.length);
});
