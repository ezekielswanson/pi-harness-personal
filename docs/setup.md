# Setup

## Side by side

| | AL harness | Personal |
| --- | --- | --- |
| Launch | `pi` | `pi-personal` |
| Agent dir | `~/.pi/agent` | `~/.pi/agent-personal` |
| Config dir | legacy AL config dir | `~/.config/pi-harness-personal` |
| Workspace | existing AL worktrees | `~/pi-personal` |
| Tag | `harness-vN` | `personal-vN` |

Nothing is shared except the global `pi` binary and Node. Do not install this package into `~/.pi/agent`.

## Personal agent dir

```sh
PI_CODING_AGENT_DIR=$HOME/.pi/agent-personal pi install git:github.com/ezekielswanson/pi-harness-personal@personal-v1
```

No `-l`. Then alias `scripts/pi-personal` and run `/login` once in that dir.

`~/.config/pi-harness-personal/harness.sha` is the approved commit. A mismatch prints a warning at session start. Tools stay available.

```sh
PI_CODING_AGENT_DIR=$HOME/.pi/agent-personal scripts/write-web-search-config.sh
PI_CODING_AGENT_DIR=$HOME/.pi/agent-personal scripts/setup-subagents.sh
```

## Workspace

```sh
scripts/new-workspace.sh ~/pi-personal
```

The script refuses a directory inside this repo or under `~/.pi`, copies `workspace-template/`, and runs `git init`.

Copy `.env.example` to `.env` and paste `NOTION_TOKEN` and `GITHUB_PERSONAL_ACCESS_TOKEN` yourself. The example values are empty. `session.ts` loads that file into `process.env` before MCP servers connect, filling only keys that are still unset.

Share the Notion integration with the pages you want reachable. An internal integration sees only pages shared with it.

## Lock

`scripts/lock-harness.sh` prints its notice and exits 0 when you run it with no arguments. It is off until you pass `lock` yourself. It refuses `$HOME/.pi/agent`. `settings.json` is never locked. `extensions/subagent/config.json` is the only file allowed under `extensions/` at lock time, and it stays writable.

## BB

BB spawns `pi --mode rpc`. Give that project `PI_CODING_AGENT_DIR=~/.pi/agent-personal`, or point BB at the `pi-personal` launcher. Do not export the variable for every BB project. How BB stores a per-project env or Pi command still needs a check on your machine. See [multi-harness](multi-harness.md).
