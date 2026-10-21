import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

function run(env: NodeJS.ProcessEnv, args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync("sh", [join(process.cwd(), "scripts", "pi-personal"), ...args], {
    env,
    encoding: "utf8",
  });
  return { status: result.status ?? 1, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
}

function stubEnv(home: string, extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  const bin = join(home, "bin");
  mkdirSync(bin, { recursive: true });
  const stub = join(bin, "pi");
  writeFileSync(stub, "#!/bin/sh\necho \"PI_CODING_AGENT_DIR=${PI_CODING_AGENT_DIR}\"\necho \"PI_PERSONAL_HOME=${PI_PERSONAL_HOME}\"\necho \"ARGS:$*\"\n");
  chmodSync(stub, 0o755);
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH ?? ""}` };
  delete env.PI_CODING_AGENT_DIR;
  delete env.PI_PERSONAL_AGENT_DIR;
  delete env.PI_PERSONAL_HOME;
  for (const [key, value] of Object.entries(extra)) {
    if (value === undefined) delete env[key];
    else env[key] = value;
  }
  return env;
}

test("pi-personal sets the personal agent dir, overrides an inherited one, and passes args", () => {
  const home = mkdtempSync(join(tmpdir(), "pi-personal-home-"));
  const plain = run(stubEnv(home), ["--foo", "bar"]);
  assert.equal(plain.status, 0, plain.stderr);
  assert.match(plain.stdout, new RegExp(`PI_CODING_AGENT_DIR=${home}/.pi/agent-personal`));
  assert.match(plain.stdout, new RegExp(`PI_PERSONAL_HOME=${home}/.config/pi-harness-personal`));
  assert.match(plain.stdout, /ARGS:--foo bar/);

  const inherited = run(stubEnv(home, { PI_CODING_AGENT_DIR: "/tmp/other" }), ["keep"]);
  assert.equal(inherited.status, 0, inherited.stderr);
  assert.match(inherited.stdout, new RegExp(`PI_CODING_AGENT_DIR=${home}/.pi/agent-personal`));
  assert.equal(inherited.stdout.includes("/tmp/other"), false);
  assert.match(inherited.stdout, /ARGS:keep/);

  const override = run(stubEnv(home, { PI_PERSONAL_AGENT_DIR: join(home, "custom-agent") }), []);
  assert.equal(override.status, 0, override.stderr);
  assert.match(override.stdout, new RegExp(`PI_CODING_AGENT_DIR=${home}/custom-agent`));
});

test("pi-personal refuses the other harness agent dir", () => {
  const home = mkdtempSync(join(tmpdir(), "pi-personal-home-"));
  const refused = run(stubEnv(home, { PI_PERSONAL_AGENT_DIR: `${home}/.pi/agent` }), []);
  assert.notEqual(refused.status, 0);
  assert.match(refused.stderr, /pi-personal/);
});
