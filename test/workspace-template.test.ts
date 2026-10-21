import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(process.cwd(), "workspace-template");

function read(path: string): string {
  return readFileSync(join(root, path), "utf8");
}

test("workspace template pins packages and MCP servers without tokens or approval", () => {
  const settings = JSON.parse(read(".pi/settings.json")) as { packages: string[]; extensions: string[] };
  assert.deepEqual(settings.packages, [
    "npm:pi-mcp-adapter@5.3.2",
    "npm:pi-smart-web-search@0.4.0",
    "npm:pi-web-access@0.42.0",
    "npm:pi-subagents@0.79.1",
  ]);
  assert.deepEqual(settings.extensions, ["-builtin:mcp"]);

  const mcp = JSON.parse(read(".mcp.json")) as { mcpServers: Record<string, { env?: Record<string, string>; headers?: Record<string, string>; url?: string }> };
  assert.deepEqual(Object.keys(mcp.mcpServers).sort(), ["github", "notion", "playwright"]);
  assert.equal(mcp.mcpServers.notion.env?.NOTION_TOKEN, "${NOTION_TOKEN}");
  assert.equal(mcp.mcpServers.github.headers?.Authorization, "Bearer ${GITHUB_PERSONAL_ACCESS_TOKEN}");
  assert.equal(mcp.mcpServers.github.url, "https://api.githubcopilot.com/mcp/");
  const raw = read(".mcp.json");
  assert.equal(raw.includes("approveTools"), false);
  assert.equal(/Bearer (?!\$\{)[A-Za-z0-9]/.test(raw), false);
  assert.equal(raw.includes("secret_"), false);

  for (const name of ["scout", "reviewer"] as const) {
    const agent = read(join(".pi", "agents", `${name}.md`));
    assert.match(agent, /^tools: read, grep, find, ls$/m);
    assert.match(agent, /^extensions: \[\]$/m);
  }

  const example = read(".env.example");
  for (const line of example.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, value] = trimmed.split("=", 2);
    assert.ok(key);
    assert.equal(value ?? "", "");
  }
  assert.equal(example.includes("approveTools"), false);
});
