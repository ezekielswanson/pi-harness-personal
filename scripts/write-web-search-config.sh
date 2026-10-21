#!/bin/sh
# Merge {"toolNames":{"webSearch":"web_research"}} into the personal agent dir.
# Optional. Off until you run it. Refuses the other harness agent dir.
set -eu

agent="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent-personal}" # default-fallback
agent="${agent%/}"
al_dir="$HOME/.pi/agent" # al-dir-check
if [ "$agent" = "$al_dir" ]; then
  echo "Refusing to write $al_dir/web-search.json. Start with pi-personal." >&2 # al-dir-check
  exit 1
fi

PI_PERSONAL_AGENT_DIR="$agent" node <<'END_NODE'
const fs = require("node:fs");
const path = require("node:path");

const agentDir = process.env.PI_PERSONAL_AGENT_DIR;
const configPath = path.join(agentDir, "web-search.json");

function refuse(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function insideAgent(target) {
  const root = fs.realpathSync(agentDir);
  const real = fs.realpathSync(target);
  const prefix = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
  if (real !== root && !real.startsWith(prefix)) refuse(`Refusing to write outside ${agentDir}.`);
  return real;
}

fs.mkdirSync(agentDir, { recursive: true });
insideAgent(agentDir);

let current = {};
if (fs.existsSync(configPath)) {
  const stat = fs.lstatSync(configPath);
  if (stat.isSymbolicLink()) refuse(`Refusing to update ${configPath}: it is a symlink.`);
  if (!stat.isFile()) refuse(`Refusing to update ${configPath}: it is not a regular file.`);
  insideAgent(configPath);
  current = JSON.parse(fs.readFileSync(configPath, "utf8"));
  if (current === null || typeof current !== "object" || Array.isArray(current)) {
    refuse(`Refusing to merge ${configPath}: expected a JSON object.`);
  }
}

const toolNames = current.toolNames && typeof current.toolNames === "object" && !Array.isArray(current.toolNames)
  ? { ...current.toolNames }
  : {};
toolNames.webSearch = "web_research";
current.toolNames = toolNames;
fs.writeFileSync(configPath, `${JSON.stringify(current, null, 2)}\n`);
insideAgent(configPath);
process.stdout.write(`Wrote ${configPath}\n`);
END_NODE
