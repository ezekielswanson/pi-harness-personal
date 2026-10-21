# Testing

```sh
npm ci
npm run check
```

`check` is `tsc --noEmit` and `node --import tsx --test test/*.test.ts`. CI uses Node 22.23.2.

Vault tests mock `fetch`. They do not call Notion. The env tests use a temp `.env` and do not print values.

`launcher.test.ts` runs `scripts/pi-personal` with a stub `pi` on `PATH`. `agent-dir.test.ts` points `PI_CODING_AGENT_DIR` at a temp directory. With the variable unset, scripts use `$HOME/.pi/agent-personal` under a temp `HOME`.

`scripts/lock-harness.sh check` is the dry pin check. Tests do not run `lock`.

`startup-pi.test.ts` installs this repo into a temp agent dir and starts `pi --mode rpc`. That step uses the npm registry for the workspace packages. It does not use `~/.pi/agent`.

Before pushing, run gitleaks on the full history (`gitleaks detect --redact`) and `npm test`, including `no-al-data.test.ts` and `no-gate.test.ts`.
