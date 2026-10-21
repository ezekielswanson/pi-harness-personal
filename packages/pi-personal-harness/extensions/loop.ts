import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getWorkspaceRoot } from "../../../src/config/paths.ts";
import { formatLesson, LESSONS_HEADER, prependLesson, type LessonEntry } from "../../../src/runtime/lessons.ts";
import { sanitizeErrorMessage } from "../../../src/utils/errors.ts";
import { toolError, toolText } from "../../../src/utils/toolResult.ts";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "append_lesson",
    label: "Append Lesson",
    description: "Prepend one retro entry to lessons.md. Existing entries stay.",
    promptSnippet: "Add one newest-first lesson",
    promptGuidelines: ["Use the three retro questions. Do not rewrite older entries."],
    parameters: Type.Object({
      date: Type.String(),
      tool: Type.String(),
      task: Type.String(),
      failed: Type.String(),
      corrected: Type.String(),
      nextTime: Type.String(),
      seenBefore: Type.Optional(Type.String()),
    }),
    async execute(_toolCallId, params) {
      try {
        const entry: LessonEntry = {
          date: params.date,
          tool: params.tool,
          task: params.task,
          failed: params.failed,
          corrected: params.corrected,
          nextTime: params.nextTime,
          seenBefore: params.seenBefore ?? "no",
        };
        const path = join(getWorkspaceRoot(), "lessons.md");
        const current = existsSync(path) ? readFileSync(path, "utf8") : LESSONS_HEADER;
        const next = prependLesson(current, formatLesson(entry));
        writeFileSync(path, next);
        return toolText({ ok: true, path: "lessons.md" });
      } catch (err) {
        return toolError(sanitizeErrorMessage(err));
      }
    },
  });
}
