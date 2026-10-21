import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import loop from "../packages/pi-personal-harness/extensions/loop.ts";
import { formatLesson, LESSONS_HEADER, prependLesson } from "../src/runtime/lessons.ts";
import { removeRepo, tempWorkspace, withEnv } from "./helpers.ts";

test("append_lesson prepends and keeps old entries", async () => {
  const root = tempWorkspace();
  const first = formatLesson({
    date: "2026-10-01",
    tool: "bash",
    task: "first",
    failed: "nothing",
    corrected: "nothing",
    nextTime: "read it back",
    seenBefore: "no",
  });
  const withFirst = prependLesson(LESSONS_HEADER, first);
  const second = formatLesson({
    date: "2026-10-02",
    tool: "read",
    task: "second",
    failed: "missed a file",
    corrected: "opened it again",
    nextTime: "read back each item",
    seenBefore: "no",
  });
  const withSecond = prependLesson(withFirst, second);
  assert.ok(withSecond.indexOf("2026-10-02") < withSecond.indexOf("2026-10-01"));
  assert.match(withSecond, /2026-10-01/);
  assert.match(withSecond, /2026-10-02/);

  await withEnv({ PI_PERSONAL_WORKSPACE: root }, async () => {
    let saved = "";
    let pending: Promise<unknown> = Promise.resolve();
    loop({
      registerTool(tool: { name: string; execute: (id: string, params: Record<string, string>) => Promise<unknown> }) {
        saved = tool.name;
        pending = tool.execute("1", {
          date: "2026-10-03",
          tool: "edit",
          task: "note",
          failed: "nothing",
          corrected: "nothing",
          nextTime: "keep the old line",
        });
      },
    } as never);
    await pending;
    assert.equal(saved, "append_lesson");
    const text = readFileSync(join(root, "lessons.md"), "utf8");
    assert.match(text, /2026-10-03/);
    const again = prependLesson(text, second);
    assert.match(again, /2026-10-03/);
    assert.match(again, /2026-10-02/);
  });
  removeRepo(root);
});
