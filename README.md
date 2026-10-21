# Pi Harness Personal

Zeke's personal harness for Pi (`@earendil-works/pi-coding-agent` 1.3.0). It loads Notion, web search, local files, scout and reviewer subagents, Playwright, GitHub MCP, and a Notion vault. It does not ask before a tool call.

It runs side by side with the AL harness. This harness uses its own agent dir `~/.pi/agent-personal` and its own config dir `~/.config/pi-harness-personal`. The AL harness in `~/.pi/agent` stays untouched.

Derived from pi-apartment-life 5b713d5 (history not carried over), tag harness-v5.

## Install

Pi is already installed globally. Install this package into the personal agent dir, without `-l`:

```sh
PI_CODING_AGENT_DIR=$HOME/.pi/agent-personal pi install git:github.com/ezekielswanson/pi-harness-personal@personal-v1
```

Alias the launcher (after that install, the script lives in the pinned checkout):

```sh
alias pi-personal="$HOME/.pi/agent-personal/git/github.com/ezekielswanson/pi-harness-personal/scripts/pi-personal"
```

Then:

1. Run `pi-personal` once and `/login`. This agent dir has its own auth, settings, sessions, and MCP sign-ins.
2. Write `harness.sha` (a warning only if it drifts):

   ```sh
   mkdir -p ~/.config/pi-harness-personal
   git -C ~/.pi/agent-personal/git/github.com/ezekielswanson/pi-harness-personal rev-parse HEAD > ~/.config/pi-harness-personal/harness.sha
   ```

3. Rename deep search so it does not clash with `web_search`:

   ```sh
   PI_CODING_AGENT_DIR=$HOME/.pi/agent-personal scripts/write-web-search-config.sh
   ```

4. Merge the subagent limits (concurrency 3, global 4, depth 1):

   ```sh
   PI_CODING_AGENT_DIR=$HOME/.pi/agent-personal scripts/setup-subagents.sh
   ```

5. Create the workspace and add your own tokens. Names only live in the example file:

   ```sh
   scripts/new-workspace.sh ~/pi-personal
   cp ~/pi-personal/.env.example ~/pi-personal/.env
   ```

   Paste `NOTION_TOKEN` and `GITHUB_PERSONAL_ACCESS_TOKEN` yourself. Do not commit that file.

6. In Notion, share your pages with the integration. In `~/pi-personal`, run `pi-personal` and `vault_setup` under a "Pi Context Vault" page.

`scripts/lock-harness.sh` is optional and off by default. `settings.json` is never locked. Leave the lock off unless you choose it.

Never run plain `pi` in `~/pi-personal`. That would load the other harness from `~/.pi/agent`. This session warns if that happens: start with `pi-personal`.

## What is in the package

Extensions, in `packages/pi-personal-harness/extensions/`:

- `session.ts` loads the workspace `.env` at startup, warns on Node, pin drift, and a missing `web-search.json`, and injects About Me.
- `vault.ts` is `vault_recall`, `vault_remember`, and `vault_setup`.
- `loop.ts` is `append_lesson` only.

Skills: `web-search`, `research`, `learn`, `review`, `personal-loop`, `vault`.

Prompts: `task`, `learn`, `review`, `verify`, `retro`, `remember`.

## Docs

- [Setup](docs/setup.md)
- [Vault](docs/vault.md)
- [Tools](docs/tools.md)
- [Subagents](docs/subagents.md)
- [Testing](docs/testing.md)
- [Multi-harness](docs/multi-harness.md)
