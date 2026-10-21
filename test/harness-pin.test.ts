import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import loop from "../packages/pi-personal-harness/extensions/loop.ts";
import session from "../packages/pi-personal-harness/extensions/session.ts";
import vault from "../packages/pi-personal-harness/extensions/vault.ts";
import { HARNESS_TAG, verifyHarnessPin } from "../src/runtime/harnessPin.ts";
import { webSearchRenameWarning } from "../src/runtime/webSearchConfig.ts";
import { withEnv } from "./helpers.ts";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-c", "user.email=cursoragent@cursor.com", "-c", "user.name=Cursor Agent", ...args], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function installTree(): { agent: string; install: string; shaFile: string; head: string } {
  const agent = mkdtempSync(join(tmpdir(), "pi-personal-pin-"));
  const install = join(agent, "git", "github.com", "ezekielswanson", "pi-harness-personal");
  mkdirSync(join(install, "src", "runtime"), { recursive: true });
  writeFileSync(join(install, "src", "runtime", "harness-tag"), `${HARNESS_TAG}\n`);
  git(install, ["init", "-b", "main"]);
  git(install, ["add", "."]);
  git(install, ["commit", "-m", "pin"]);
  git(install, ["tag", "-a", HARNESS_TAG, "-m", "pin"]);
  const head = git(install, ["rev-parse", "HEAD"]);
  const shaFile = join(agent, "harness.sha");
  writeFileSync(shaFile, `${head}\n`);
  return { agent, install, shaFile, head };
}

test("a matching pin is quiet and a SHA mismatch is only a warning", () => {
  const tree = installTree();
  const match = verifyHarnessPin({ agentDir: tree.agent, approvedShaFile: tree.shaFile });
  assert.equal(match.ok, true, match.warnings.join("\n"));
  assert.deepEqual(match.warnings, []);

  writeFileSync(tree.shaFile, `${"a".repeat(40)}\n`);
  const drifted = verifyHarnessPin({ agentDir: tree.agent, approvedShaFile: tree.shaFile });
  assert.equal(drifted.ok, false);
  assert.match(drifted.warnings.join("\n"), /approved SHA/);
});

test("the other harness agent dir warns to start with pi-personal", () => {
  const report = verifyHarnessPin({ agentDir: join(homedir(), ".pi", "agent") });
  assert.equal(report.ok, false);
  assert.match(report.warnings.join("\n"), /Start with pi-personal/);
});

test("a pin warning does not block tool registration", async () => {
  const agent = mkdtempSync(join(tmpdir(), "pi-personal-empty-"));
  const events: string[] = [];
  const tools: string[] = [];
  const notices: string[] = [];
  const api = {
    on(event: string, handler: (event: unknown, ctx: unknown) => void) {
      events.push(event);
      if (event === "session_start") {
        handler(
          {},
          {
            ui: { notify(message: string) { notices.push(message); } },
            sessionManager: { getSessionId: () => "session-1" },
          },
        );
      }
    },
    registerTool(tool: { name: string }) {
      tools.push(tool.name);
    },
  };
  await withEnv({ PI_CODING_AGENT_DIR: agent, PI_PERSONAL_HOME: join(agent, "config") }, () => {
    session(api as never);
    vault(api as never);
    loop(api as never);
  });
  assert.equal(events.includes("tool_call"), false);
  assert.deepEqual(tools.sort(), ["append_lesson", "vault_recall", "vault_remember", "vault_setup"]);
  assert.ok(notices.some((message) => /Pinned checkout|web-search\.json/.test(message)));
});

test("a missing web-search rename is a warning and the expected file clears it", () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-personal-web-"));
  const missing = webSearchRenameWarning(dir);
  assert.match(missing ?? "", /web_search|web_research/);
  assert.match(missing ?? "", /web-search\.json/);
  writeFileSync(join(dir, "web-search.json"), `${JSON.stringify({ toolNames: { webSearch: "web_research" } })}\n`);
  assert.equal(webSearchRenameWarning(dir), null);
});
