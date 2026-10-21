#!/bin/sh
# Merge pi-subagents limits into the personal agent dir. No install.
# Config: ${PI_CODING_AGENT_DIR:-$HOME/.pi/agent-personal}/extensions/subagent/config.json
set -eu

agent="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent-personal}" # default-fallback
agent="${agent%/}"
al_dir="$HOME/.pi/agent" # al-dir-check
if [ "$agent" = "$al_dir" ]; then
  echo "Refusing to write $al_dir. Start with pi-personal." >&2 # al-dir-check
  exit 1
fi

PI_PERSONAL_AGENT_DIR="$agent" node <<'END_NODE'
const fs = require("node:fs");
const path = require("node:path");

const agentDir = process.env.PI_PERSONAL_AGENT_DIR;
const configPath = path.join(agentDir, "extensions", "subagent", "config.json");
const configSuffix = path.join(agentDir, "extensions", "subagent", "config.json");

function refuse(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

if (path.resolve(configPath) !== path.resolve(configSuffix)) {
  refuse("Refusing to write subagent config: unexpected path.");
}

function insideAgent(target) {
  fs.mkdirSync(agentDir, { recursive: true });
  const root = fs.realpathSync(agentDir);
  const real = fs.realpathSync(target);
  const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (real !== root && !real.startsWith(prefix)) refuse(`Refusing to touch ${target}: it resolves outside the agent dir.`);
  return real;
}

const desired = {
  parallel: { concurrency: 3 },
  globalConcurrencyLimit: 4,
  maxSubagentDepth: 1,
};

function stamp() {
  const d = new Date();
  const p = (n, width = 2) => String(n).padStart(width, "0");
  return [
    String(d.getFullYear()),
    p(d.getMonth() + 1),
    p(d.getDate()),
    "T",
    p(d.getHours()),
    p(d.getMinutes()),
    p(d.getSeconds()),
    p(d.getMilliseconds(), 3),
  ].join("");
}

function writeConfig(value) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const dirStat = fs.lstatSync(path.dirname(configPath));
  if (dirStat.isSymbolicLink()) refuse(`Refusing to write ${configPath}: parent directory is a symlink.`);
  const dirReal = insideAgent(path.dirname(configPath));
  if (!dirReal.endsWith(`${path.sep}extensions${path.sep}subagent`)) {
    refuse(`Refusing to write ${configPath}: directory is not <agent dir>/extensions/subagent.`);
  }
  fs.writeFileSync(configPath, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o644 });
  const written = insideAgent(configPath);
  if (!written.endsWith(`${path.sep}extensions${path.sep}subagent${path.sep}config.json`)) {
    refuse(`Refusing to write ${configPath}: file is not <agent dir>/extensions/subagent/config.json.`);
  }
}

if (!fs.existsSync(configPath)) {
  writeConfig(desired);
  process.stdout.write(`Created ${configPath}\n`);
  process.exit(0);
}

const existingStat = fs.lstatSync(configPath);
if (existingStat.isSymbolicLink()) {
  process.stderr.write(`Refusing to update ${configPath}: it is a symlink. The file was not changed.\n`);
  process.exit(1);
}
if (!existingStat.isFile()) {
  process.stderr.write(`Refusing to update ${configPath}: it is not a regular file. The file was not changed.\n`);
  process.exit(1);
}
insideAgent(configPath);

let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Refusing to merge ${configPath}: not valid JSON (${message}). The file was not changed.\n`);
  process.exit(1);
}
if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
  process.stderr.write(`Refusing to merge ${configPath}: expected a JSON object. The file was not changed.\n`);
  process.exit(1);
}

const currentParallel = parsed.parallel;
const parallelOk = currentParallel !== null && typeof currentParallel === "object" && !Array.isArray(currentParallel) && currentParallel.concurrency === 3;
if (parallelOk && parsed.globalConcurrencyLimit === 4 && parsed.maxSubagentDepth === 1) {
  process.stdout.write(`${configPath} already has the limits. Left it unchanged.\n`);
  process.exit(0);
}

const next = { ...parsed };
if (currentParallel !== null && typeof currentParallel === "object" && !Array.isArray(currentParallel)) {
  next.parallel = { ...currentParallel, concurrency: 3 };
} else {
  next.parallel = { concurrency: 3 };
}
next.globalConcurrencyLimit = 4;
next.maxSubagentDepth = 1;

let backup = `${configPath}.bak.${stamp()}`;
if (fs.existsSync(backup)) backup = `${backup}-${process.pid}`;
fs.copyFileSync(configPath, backup);
writeConfig(next);
process.stdout.write(`Updated ${configPath}\nBackup ${backup}\n`);
END_NODE

cat <<'EOF'

Next steps:
  1. Start pi-personal in the personal workspace.
  2. Run /subagents-doctor
  3. Use scout for parallel reading
  4. Use reviewer on a change
EOF
