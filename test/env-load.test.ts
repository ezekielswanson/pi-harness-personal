import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { loadRootEnv } from "../src/config/loadEnv.ts";
import { removeRepo, tempWorkspace } from "./helpers.ts";

test("workspace .env fills unset keys, does not override set ones, and never logs values", () => {
  const root = tempWorkspace();
  const key = "PERSONAL_ENV_PROBE";
  const previous = process.env[key];
  const logs: string[] = [];
  const original = console.error;
  console.error = (line?: unknown) => {
    logs.push(String(line));
  };
  delete process.env[key];
  try {
    writeFileSync(join(root, ".env"), `${key}=probe-value\n`);
    loadRootEnv(root);
    assert.equal(process.env[key], "probe-value");
    process.env[key] = "already-set";
    writeFileSync(join(root, ".env"), `${key}=next-value\nPERSONAL_ENV_OTHER=other-value\n`);
    loadRootEnv(root);
    assert.equal(process.env[key], "already-set");
    assert.equal(process.env.PERSONAL_ENV_OTHER, "other-value");
    const dumped = logs.join("\n");
    assert.equal(dumped.includes("probe-value"), false);
    assert.equal(dumped.includes("next-value"), false);
    assert.equal(dumped.includes("other-value"), false);
  } finally {
    console.error = original;
    if (previous === undefined) delete process.env[key];
    else process.env[key] = previous;
    delete process.env.PERSONAL_ENV_OTHER;
    removeRepo(root);
  }
});
