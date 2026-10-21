import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { EXPECTED_PROJECT_PACKAGES } from "../src/runtime/harnessPin.ts";

test("the workspace template pins the web packages next to the MCP adapter and subagents", () => {
  const settings = JSON.parse(readFileSync(join(process.cwd(), "workspace-template", ".pi", "settings.json"), "utf8")) as {
    packages: string[];
  };
  assert.deepEqual(settings.packages, [...EXPECTED_PROJECT_PACKAGES]);
  assert.deepEqual(settings.packages, [
    "npm:pi-mcp-adapter@5.3.2",
    "npm:pi-smart-web-search@0.4.0",
    "npm:pi-web-access@0.42.0",
    "npm:pi-subagents@0.79.1",
  ]);
  const mcp = readFileSync(join(process.cwd(), "workspace-template", ".mcp.json"), "utf8");
  assert.equal(mcp.includes("mcp.exa.ai"), false);
  assert.equal(mcp.includes("approveTools"), false);
});
