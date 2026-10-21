import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultAgentDir } from "./harnessPin.ts";

export const WEB_SEARCH_RENAME = { toolNames: { webSearch: "web_research" } } as const;

/** Warning when the agent dir is missing the web_research rename file. */
export function webSearchRenameWarning(agentDir = defaultAgentDir()): string | null {
  const path = join(agentDir, "web-search.json");
  if (!existsSync(path)) {
    return `Warning: ${path} is missing. Add ${JSON.stringify(WEB_SEARCH_RENAME)} so web_search and web_research do not clash.`;
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as { toolNames?: { webSearch?: unknown } };
    if (parsed.toolNames?.webSearch === "web_research") return null;
  } catch {
    return `Warning: ${path} is not the web_research rename ${JSON.stringify(WEB_SEARCH_RENAME)}.`;
  }
  return `Warning: ${path} must set toolNames.webSearch to "web_research". Expected ${JSON.stringify(WEB_SEARCH_RENAME)}.`;
}
