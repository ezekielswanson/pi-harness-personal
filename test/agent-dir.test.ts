import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { defaultAgentDir, verifyHarnessPin } from "../src/runtime/harnessPin.ts";
import { withEnv } from "./helpers.ts";

function run(command: string, args: string[], env: NodeJS.ProcessEnv): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(command, args, { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    const failed = error as { status?: number; stdout?: string; stderr?: string };
    return { status: failed.status ?? 1, stdout: failed.stdout ?? "", stderr: failed.stderr ?? "" };
  }
}

test("harnessPin uses PI_CODING_AGENT_DIR and otherwise the personal dir", async () => {
  const temp = mkdtempSync(join(tmpdir(), "pi-personal-agent-"));
  await withEnv({ PI_CODING_AGENT_DIR: temp }, () => {
    assert.equal(defaultAgentDir(), temp);
  });
  await withEnv({ PI_CODING_AGENT_DIR: undefined }, () => {
    assert.equal(defaultAgentDir(), join(homedir(), ".pi", "agent-personal"));
  });
  const warning = verifyHarnessPin({ agentDir: join(homedir(), ".pi", "agent") });
  assert.match(warning.warnings.join("\n"), /Start with pi-personal/);
});

test("setup and web-search scripts write only inside the temp agent dir", () => {
  const home = mkdtempSync(join(tmpdir(), "pi-personal-home-"));
  const agent = mkdtempSync(join(tmpdir(), "pi-personal-agent-"));
  writeFileSync(join(agent, "web-search.json"), `${JSON.stringify({ keep: true, toolNames: { other: "stay" } })}\n`);
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, PI_CODING_AGENT_DIR: agent };
  delete env.PI_PERSONAL_AGENT_DIR;
  const web = run("sh", [join(process.cwd(), "scripts", "write-web-search-config.sh")], env);
  assert.equal(web.status, 0, web.stderr);
  const webFile = join(agent, "web-search.json");
  assert.equal(existsSync(webFile), true);
  assert.equal(existsSync(join(home, ".pi", "agent", "web-search.json")), false);
  const written = JSON.parse(readFileSync(webFile, "utf8")) as { keep: boolean; toolNames: { webSearch: string; other: string } };
  assert.equal(written.toolNames.webSearch, "web_research");
  assert.equal(written.toolNames.other, "stay");
  assert.equal(written.keep, true);

  const sub = run("sh", [join(process.cwd(), "scripts", "setup-subagents.sh")], env);
  assert.equal(sub.status, 0, sub.stderr);
  const config = join(agent, "extensions", "subagent", "config.json");
  assert.equal(existsSync(config), true);
  assert.equal(existsSync(join(home, ".pi", "agent", "extensions", "subagent", "config.json")), false);
  const parsed = JSON.parse(readFileSync(config, "utf8")) as { parallel: { concurrency: number }; globalConcurrencyLimit: number; maxSubagentDepth: number };
  assert.equal(parsed.parallel.concurrency, 3);
  assert.equal(parsed.globalConcurrencyLimit, 4);
  assert.equal(parsed.maxSubagentDepth, 1);
});

test("with PI_CODING_AGENT_DIR unset, scripts use $HOME/.pi/agent-personal", () => {
  const home = mkdtempSync(join(tmpdir(), "pi-personal-home-"));
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home };
  delete env.PI_CODING_AGENT_DIR;
  delete env.PI_PERSONAL_AGENT_DIR;
  const web = run("sh", [join(process.cwd(), "scripts", "write-web-search-config.sh")], env);
  assert.equal(web.status, 0, web.stderr);
  assert.equal(existsSync(join(home, ".pi", "agent-personal", "web-search.json")), true);

  const install = join(home, ".pi", "agent-personal", "git", "github.com", "ezekielswanson", "pi-harness-personal");
  mkdirSync(join(install, "scripts"), { recursive: true });
  mkdirSync(join(install, "src", "runtime"), { recursive: true });
  const script = join(install, "scripts", "lock-harness.sh");
  writeFileSync(script, readFileSync(join(process.cwd(), "scripts", "lock-harness.sh")));
  chmodSync(script, 0o755);
  writeFileSync(join(install, "src", "runtime", "harness-tag"), "personal-v1\n");
  const paths = run("sh", [script, "paths"], env);
  assert.equal(paths.status, 0, paths.stderr);
  assert.match(paths.stdout, new RegExp(`agent ${home}/\\.pi/agent-personal`));
  assert.match(paths.stdout, new RegExp(`config ${home}/\\.config/pi-harness-personal`));
});

test("scripts refuse the other harness agent dir and do not write there", () => {
  const home = mkdtempSync(join(tmpdir(), "pi-personal-home-"));
  const al = join(home, ".pi", "agent");
  const env: NodeJS.ProcessEnv = { ...process.env, HOME: home, PI_CODING_AGENT_DIR: al };
  const web = run("sh", [join(process.cwd(), "scripts", "write-web-search-config.sh")], env);
  assert.notEqual(web.status, 0);
  assert.match(web.stderr, /pi-personal/);
  assert.equal(existsSync(join(al, "web-search.json")), false);
  const sub = run("sh", [join(process.cwd(), "scripts", "setup-subagents.sh")], env);
  assert.notEqual(sub.status, 0);
  assert.equal(existsSync(join(al, "extensions", "subagent", "config.json")), false);
});
