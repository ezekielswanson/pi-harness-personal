import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("a fresh module evaluation still fills unset keys and does not print values", () => {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.PERSONAL_ENV_PROBE;
  delete env.PERSONAL_ENV_NEW;
  const result = spawnSync(process.execPath, ["--import", "tsx", "test/probes/env-reload-probe.ts"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /^ok\n?$/);
  assert.equal(result.stdout.includes("probe-value"), false);
  assert.equal(result.stdout.includes("next-value"), false);
  assert.equal(result.stderr.includes("probe-value"), false);
  assert.equal(result.stderr.includes("next-value"), false);
});
