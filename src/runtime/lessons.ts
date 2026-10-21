// Newest-first lessons log. One entry per retro. Existing entries stay put.

export interface LessonEntry {
  date: string;
  tool: string;
  task: string;
  failed: string;
  corrected: string;
  nextTime: string;
  seenBefore: string;
}

export function formatLesson(entry: LessonEntry): string {
  return [
    `## ${entry.date} . ${entry.tool} . ${entry.task}`,
    `- Failed:    ${entry.failed || "nothing"}`,
    `- Corrected: ${entry.corrected || "nothing"}`,
    `- Next time: ${entry.nextTime}`,
    `- Seen before? ${entry.seenBefore || "no"}`,
    "",
  ].join("\n");
}

export function prependLesson(markdown: string, entry: string): string {
  const trimmed = entry.trim();
  if (!trimmed.startsWith("## ")) throw new Error("Lesson entry must start with a ## heading.");
  for (const label of ["- Failed:", "- Corrected:", "- Next time:"]) {
    if (!trimmed.includes(label)) throw new Error(`Lesson entry needs "${label}".`);
  }
  const existingHeadings = markdown.match(/^## .+$/gm) ?? [];
  const headerEnd = markdown.indexOf("\n## ");
  const head = headerEnd === -1 ? markdown.replace(/\s*$/, "") : markdown.slice(0, headerEnd).replace(/\s*$/, "");
  const tail = headerEnd === -1 ? "" : markdown.slice(headerEnd).replace(/^\n/, "");
  const next = `${head}\n\n${trimmed}${tail ? `\n\n${tail}` : "\n"}`;
  for (const heading of existingHeadings) {
    if (!next.includes(heading)) throw new Error("Refusing to drop an existing lesson.");
  }
  if ((next.match(/^## .+$/gm) ?? []).length !== existingHeadings.length + 1) {
    throw new Error("Lesson entry must add exactly one heading.");
  }
  return next.endsWith("\n") ? next : `${next}\n`;
}

export const LESSONS_HEADER = `# Lessons (newest first, append-only)

<!-- template
    ## [date] . [tool] . [task]
    - Failed:    [one line / nothing]
    - Corrected: [what Zeke fixed / nothing]
    - Next time: [one line]
    - Seen before? [yes: link | no]
-->
`;
