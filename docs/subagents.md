# Subagents

pi-subagents 0.79.1 is pinned in the workspace template. Agent files live in the workspace:

- `.pi/agents/scout.md` reads the repo. Tools: `read`, `grep`, `find`, `ls`.
- `.pi/agents/reviewer.md` returns must fix, should fix, nits, and questions. Same tools.

Both set `extensions: []`.

## Config

`scripts/setup-subagents.sh` does not install packages. It merges this file:

`${PI_CODING_AGENT_DIR:-$HOME/.pi/agent-personal}/extensions/subagent/config.json`

```json
{
  "parallel": { "concurrency": 3 },
  "globalConcurrencyLimit": 4,
  "maxSubagentDepth": 1
}
```

Existing keys are kept. A backup is written beside the file only when the merge changes it. The script refuses `$HOME/.pi/agent` and refuses to write outside the resolved agent dir.

Run it with the personal agent dir:

```sh
PI_CODING_AGENT_DIR=$HOME/.pi/agent-personal scripts/setup-subagents.sh
```

Then, in a `pi-personal` session, `/subagents-doctor`. Keep at most 3 children, depth 1.
