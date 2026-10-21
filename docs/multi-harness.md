# Multi-harness

One repo, one agent dir, one config dir, one launcher, and one workspace per harness. A harness never installs into another harness's agent dir. Each lock script only touches its own dirs.

| Harness | Repo | Agent dir (`PI_CODING_AGENT_DIR`) | Config dir | Launcher | Tag | Workspace |
| --- | --- | --- | --- | --- | --- | --- |
| Apartment Life (legacy) | existing legacy repo | `~/.pi/agent` (Pi default) | legacy AL config dir | `pi` | `harness-vN` | existing AL worktrees |
| Personal | `pi-harness-personal` | `~/.pi/agent-personal` | `~/.config/pi-harness-personal` | `pi-personal` | `personal-vN` | `~/pi-personal` |
| Optidge | `pi-harness-optidge` | `~/.pi/agent-optidge` | `~/.config/pi-harness-optidge` | `pi-optidge` | `optidge-vN` | `~/pi-optidge` |
| Optidge client | `pi-harness-optidge-<client>` | `~/.pi/agent-optidge-<client>` | `~/.config/pi-harness-optidge-<client>` | `pi-optidge-<client>` | `optidge-<client>-vN` | `~/pi-optidge-<client>` |

`<client>` is a lowercase slug (`[a-z0-9-]+`).

Each dir has its own `/login`, settings, sessions, `web-search.json`, subagent config, and MCP sign-ins. Secrets live in that workspace's `.env`. MCP servers live in the workspace `.mcp.json`, never in `~/.config/mcp/mcp.json`.

A new harness starts from this repo: copy the launcher and scripts, and change the four names (repo, agent dir, config dir, launcher).

## BB

BB spawns `pi --mode rpc`, so it needs `PI_CODING_AGENT_DIR` per project. Check whether BB has a per-project env or a per-project Pi command, and point that project at `pi-personal`. Do not start BB globally with the variable set. That would apply it to every project, including the legacy harness.

Until that is verified, use the `pi-personal` launcher in a terminal.
