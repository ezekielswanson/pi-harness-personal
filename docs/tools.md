# Tools

Phase 1, in the order to build and verify:

| Priority | Job | Tool |
| --- | --- | --- |
| 1 | Notion | `@notionhq/notion-mcp-server` 2.5.2 |
| 2 | Web search, fetch, deep research, PDF, YouTube | pi-smart-web-search 0.4.0, pi-web-access 0.42.0 |
| 3 | Local files, notes, shell | Pi `read`, `write`, `edit`, `bash`, `grep`, `find`, `ls` |
| 4 | Parallel reading, critique | pi-subagents 0.79.1: `scout`, `reviewer` |
| 5 | Browser | `@playwright/mcp` 0.0.83 |
| 6 | GitHub | `https://api.githubcopilot.com/mcp/` and `GITHUB_PERSONAL_ACCESS_TOKEN` |
| 7 | Memory | `vault_recall`, `vault_remember`, `vault_setup`, About Me, `lessons.md` |

`web_research` is the pi-web-access search tool after `web-search.json` renames `webSearch` to `web_research`. Playwright is only for pages that need a real browser.

MCP servers live in the workspace `.mcp.json`. Leave `~/.config/mcp/mcp.json` empty so harnesses do not share servers.

pi-mcp-adapter 5.3.2 expands `${VAR}` in stdio `env` and HTTP `headers` (`interpolateEnvVars` / `resolveCommandSecretsRecord`). The template stays on 5.3.2.

## Phase 2

Not in this package:

- Calendar and email: `workspace-mcp`
- YouTube transcripts if pi-web-access is not enough: `youtube-transcript-mcp`
- Flashcards: `anki-mcp-server`
- Morning digest: a launchd job running `pi-personal -p "/digest"` in `~/pi-personal`
- Local graph memory: `@modelcontextprotocol/server-memory`
- Library docs: `@upstash/context7-mcp`
- `web_fetch`: `pi-smart-fetch` 0.3.17, which needs Node 24.18+ and Bun
- A `summarizer` subagent, and a sync from the Skills database to `skills/*/SKILL.md`
