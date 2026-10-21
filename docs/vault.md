# Vault

The vault is one Notion page, usually titled "Pi Context Vault", with four children. `vault_setup` creates any that are missing and writes the ids to `.pi/personal.json`.

## Schema

About Me is a page. The first 4,000 characters are injected once per session. If the ids are missing, the session says: `Vault not set up: run vault_setup`.

Memories is a database:

| Property | Type | Values |
| --- | --- | --- |
| Fact | title | one sentence |
| Scope | select | Global, Learning, Projects, Personal, Pi |
| Type | select | preference, decision, fact, person, how-to |
| Source | rich text | defaults to `pi:<session id>` |
| Date | date | today |
| Status | select | Active (default), Retired. Empty counts as Active |
| Supersedes | relation to Memories | the older fact this replaces |

Skills is a database: Name (title), When to use (rich text), Steps (rich text), Status (Active, Retired).

Workstreams is a page. Add a child page per ongoing area.

Env overrides, when set, win over the file: `VAULT_ABOUT_ME_PAGE_ID`, `VAULT_MEMORIES_DB_ID`, `VAULT_SKILLS_DB_ID`, `VAULT_WORKSTREAMS_PAGE_ID`.

## Tools

`vault_recall` reads `GET /v1/databases/{id}`, takes the data source id, then `POST /v1/data_sources/{id}/query`. The filter is Fact contains `text`, optional Scope and Type, and Status not Retired unless `includeRetired` is true. Sort is Date descending. The default limit is 10. Results are Fact, Scope, Type, Date, and url.

`vault_remember` creates the row immediately. Date is today. Status defaults to Active. Source defaults to `pi:<session id>`.

`vault_setup({ parentPageId })` is idempotent. It reuses ids already in `.pi/personal.json` or children with the same title, then writes `.pi/personal.json`.

Requests use `Notion-Version: 2025-09-03` and `Authorization: Bearer` from `NOTION_TOKEN`. The token is not printed.

General Notion work goes through `@notionhq/notion-mcp-server` in the workspace `.mcp.json`. The vault tools use the REST wrapper so their behavior does not depend on MCP tool names.
