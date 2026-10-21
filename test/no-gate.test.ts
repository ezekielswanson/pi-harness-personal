import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const PATTERNS = [
  "submit_plan|plan id|OK RED|GREEN|YELLOW|RED tier|approvalChannelRefusal|ledger_apply|approveTools",
  "notionArgsDenied|deniedTitles|deniedPageIds|DENIED_NOTION|notion-scope|notionScope|assertNotionAccess|redactDenied|Builds and Bugs|allowlist|isDenied",
];

function grep(pattern: string, roots: string[]): string {
  try {
    return execFileSync("grep", ["-R", "-n", "-E", "-I", pattern, ...roots], {
      cwd: process.cwd(),
      encoding: "utf8",
    });
  } catch (error) {
    const failed = error as { status?: number; stdout?: string };
    if (failed.status === 1) return "";
    throw error;
  }
}

test("source, package, AGENTS, and workspace template have no gate or scope terms", () => {
  const roots = ["src", "packages", "AGENTS.md", "workspace-template"];
  for (const pattern of PATTERNS) {
    const lines = grep(pattern, roots)
      .split("\n")
      .filter((line) => line && !line.includes(".test.ts"));
    assert.deepEqual(lines, [], pattern);
  }
});
