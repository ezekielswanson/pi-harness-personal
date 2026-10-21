import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

test("pi --mode rpc --no-session starts with the harness and project packages", { timeout: 240_000 }, async () => {
  const root = mkdtempSync(join(tmpdir(), "pi-personal-start-"));
  const agent = join(root, "agent");
  const project = join(root, "project");
  mkdirSync(agent, { recursive: true });
  mkdirSync(join(project, ".pi"), { recursive: true });
  writeFileSync(join(project, "package.json"), "{\"name\":\"startup-check\",\"private\":true}\n");
  writeFileSync(
    join(project, ".pi", "settings.json"),
    `${JSON.stringify({
      packages: [
        "npm:pi-mcp-adapter@5.3.2",
        "npm:pi-smart-web-search@0.4.0",
        "npm:pi-web-access@0.42.0",
        "npm:pi-subagents@0.79.1",
      ],
      extensions: ["-builtin:mcp"],
    }, null, 2)}\n`,
  );
  writeFileSync(join(project, ".pi", "personal.json"), `${JSON.stringify({ vault: { parentPageId: "", aboutMePageId: "", memoriesDbId: "", skillsDbId: "", workstreamsPageId: "" } })}\n`);
  writeFileSync(join(agent, "web-search.json"), `${JSON.stringify({ toolNames: { webSearch: "web_research" } }, null, 2)}\n`);
  writeFileSync(join(agent, "trust.json"), `${JSON.stringify({ [realpathSync(project)]: true }, null, 2)}\n`);
  const env: NodeJS.ProcessEnv = { ...process.env, PI_CODING_AGENT_DIR: agent, PI_PERSONAL_HOME: join(root, "config") };
  delete env.NODE_PATH;
  const pi = resolve("node_modules/.bin/pi");
  execFileSync(pi, ["install", resolve("."), "--approve"], { cwd: project, env, stdio: ["ignore", "pipe", "pipe"] });

  const child = spawn(pi, ["--mode", "rpc", "--no-session"], { cwd: project, env, stdio: ["pipe", "pipe", "pipe"] });
  let out = "";
  let err = "";
  child.stdout.on("data", (chunk: Buffer) => {
    out += chunk.toString();
  });
  child.stderr.on("data", (chunk: Buffer) => {
    err += chunk.toString();
  });
  const exit = new Promise<number>((done) => {
    child.on("exit", (code) => done(code ?? 1));
  });
  child.stdin.write(`${JSON.stringify({ id: "1", type: "get_state" })}\n`);
  let interval: ReturnType<typeof setInterval> | undefined;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const winner = await Promise.race([
    exit.then((code) => ({ kind: "exit" as const, code })),
    new Promise<{ kind: "ready" }>((done) => {
      interval = setInterval(() => {
        if (out.includes('"type":"response"') || out.includes('"type": "response"')) done({ kind: "ready" });
      }, 250);
    }),
    new Promise<{ kind: "timeout" }>((done) => {
      timeout = setTimeout(() => done({ kind: "timeout" }), 180_000);
    }),
  ]);
  if (interval) clearInterval(interval);
  if (timeout) clearTimeout(timeout);
  child.kill("SIGTERM");
  await Promise.race([exit, new Promise((done) => setTimeout(done, 2_000))]);
  const text = `${out}\n${err}`;
  assert.equal(text.includes("does not export a valid factory function"), false, text);
  assert.equal(/Tool name conflict.*web_search|web_search.*already registered|conflict.*web_search/i.test(text), false, text);
  assert.equal(winner.kind, "ready", text);
});
