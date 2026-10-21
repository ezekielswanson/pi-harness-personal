import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { HARNESS_TAG } from "../src/runtime/harnessPin.ts";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-c", "user.email=cursoragent@cursor.com", "-c", "user.name=Cursor Agent", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function checkout(tag: string): { agent: string; script: string; config: string } {
  const root = mkdtempSync(join(tmpdir(), "pi-personal-lock-"));
  const agent = join(root, "agent");
  const install = join(agent, "git", "github.com", "ezekielswanson", "pi-harness-personal");
  mkdirSync(join(install, "scripts"), { recursive: true });
  mkdirSync(join(install, "src", "runtime"), { recursive: true });
  const script = join(install, "scripts", "lock-harness.sh");
  writeFileSync(script, readFileSync(join(process.cwd(), "scripts", "lock-harness.sh")));
  chmodSync(script, 0o755);
  writeFileSync(join(install, "src", "runtime", "harness-tag"), `${HARNESS_TAG}\n`);
  git(install, ["init"]);
  git(install, ["add", "scripts", "src"]);
  git(install, ["commit", "-m", "pin"]);
  git(install, ["tag", "-a", tag, "-m", "pin"]);
  const config = join(root, "config");
  mkdirSync(config, { recursive: true });
  writeFileSync(join(config, "harness.sha"), `${git(install, ["rev-parse", "HEAD"])}\n`);
  return { agent, script, config };
}

function runCheck(agent: string, script: string, config: string): { status: number; stderr: string; stdout: string } {
  const env: NodeJS.ProcessEnv = { ...process.env, PI_CODING_AGENT_DIR: agent, PI_PERSONAL_HOME: config };
  delete env.NODE_PATH;
  try {
    const stdout = execFileSync("sh", [script, "check"], { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { status: 0, stderr: "", stdout };
  } catch (error) {
    const failed = error as { status?: number; stderr?: string; stdout?: string };
    return { status: failed.status ?? 1, stderr: failed.stderr ?? "", stdout: failed.stdout ?? "" };
  }
}

test("lock check accepts the current annotated tag and refuses a different one", () => {
  const scriptText = readFileSync(join(process.cwd(), "scripts", "lock-harness.sh"), "utf8");
  assert.equal(/harness-v[0-9]+/.test(scriptText), false);
  assert.match(scriptText, /\^personal-v\[0-9\]\+\$/);
  assert.equal(HARNESS_TAG, readFileSync(join(process.cwd(), "src", "runtime", "harness-tag"), "utf8").trim());

  const current = checkout(HARNESS_TAG);
  const ok = runCheck(current.agent, current.script, current.config);
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, new RegExp(HARNESS_TAG));

  const other = checkout("personal-v2");
  const refused = runCheck(other.agent, other.script, other.config);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, new RegExp(HARNESS_TAG));
  assert.match(refused.stderr, /annotated tag/);
});

test("lock with no arguments is off and does not lock", () => {
  const current = checkout(HARNESS_TAG);
  const stdout = execFileSync("sh", [current.script], {
    env: { ...process.env, PI_CODING_AGENT_DIR: current.agent, PI_PERSONAL_HOME: current.config },
    encoding: "utf8",
  });
  assert.match(stdout, /Off by default/);
  assert.match(stdout, /settings\.json is never locked/);
});
