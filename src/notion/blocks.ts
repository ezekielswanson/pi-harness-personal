function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function plainText(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (!isRecord(part)) return "";
      if (typeof part.plain_text === "string") return part.plain_text;
      const text = part.text;
      if (isRecord(text) && typeof text.content === "string") return text.content;
      return "";
    })
    .join("");
}

const TEXT_BLOCKS = new Set([
  "paragraph",
  "heading_1",
  "heading_2",
  "heading_3",
  "bulleted_list_item",
  "numbered_list_item",
  "quote",
  "callout",
  "to_do",
  "toggle",
]);

/** Flatten one page of Notion block children into plain text. */
export function blocksToText(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.results)) return "";
  const lines: string[] = [];
  for (const block of payload.results) {
    if (!isRecord(block) || typeof block.type !== "string") continue;
    if (!TEXT_BLOCKS.has(block.type)) continue;
    const body = block[block.type];
    if (!isRecord(body)) continue;
    const text = plainText(body.rich_text).trim();
    if (text) lines.push(text);
  }
  return lines.join("\n");
}
