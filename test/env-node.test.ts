import assert from "node:assert/strict";
import test from "node:test";
import { parseEnvText } from "../src/config/loadEnv.ts";
import { nodeVersionBlock } from "../src/runtime/nodeVersion.ts";

test("parseEnvText keeps quoted hashes and drops unquoted comments", () => {
  const parsed = parseEnvText(`
# comment
export NOTION_TOKEN=secret # not the token
QUOTED="keep # this"
SINGLE='hash # stays'
ESCAPED="line\\nnext"
`);
  assert.equal(parsed.NOTION_TOKEN, "secret");
  assert.equal(parsed.QUOTED, "keep # this");
  assert.equal(parsed.SINGLE, "hash # stays");
  assert.equal(parsed.ESCAPED, "line\nnext");
});

test("nodeVersionBlock warns on Node older than 22.19 and does not refuse", () => {
  assert.equal(nodeVersionBlock("22.19.0"), null);
  assert.equal(nodeVersionBlock("22.23.2"), null);
  assert.equal(nodeVersionBlock("24.0.0"), null);
  assert.equal(nodeVersionBlock("24.11.0"), null);
  assert.match(nodeVersionBlock("22.18.0") ?? "", /Warning/);
  assert.match(nodeVersionBlock("20.19.2") ?? "", /Tools stay available/);
  assert.equal(nodeVersionBlock(process.versions.node), null);
});
