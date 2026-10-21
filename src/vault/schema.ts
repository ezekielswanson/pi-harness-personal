export const MEMORY_SCOPES = ["Global", "Learning", "Projects", "Personal", "Pi"] as const;
export const MEMORY_TYPES = ["preference", "decision", "fact", "person", "how-to"] as const;
export const STATUSES = ["Active", "Retired"] as const;

export type MemoryScope = (typeof MEMORY_SCOPES)[number];
export type MemoryType = (typeof MEMORY_TYPES)[number];
export type VaultStatus = (typeof STATUSES)[number];

export const ABOUT_ME_TITLE = "About Me";
export const MEMORIES_TITLE = "Memories";
export const SKILLS_TITLE = "Skills";
export const WORKSTREAMS_TITLE = "Workstreams";
export const ABOUT_ME_LIMIT = 4_000;
export const VAULT_MISSING_LINE = "Vault not set up: run vault_setup";

function select(options: readonly string[]) {
  return { select: { options: options.map((name) => ({ name })) } };
}

export function memoriesProperties(dataSourceId?: string): Record<string, unknown> {
  const properties: Record<string, unknown> = {
    Fact: { title: {} },
    Scope: select(MEMORY_SCOPES),
    Type: select(MEMORY_TYPES),
    Source: { rich_text: {} },
    Date: { date: {} },
    Status: select(STATUSES),
  };
  if (dataSourceId) {
    properties.Supersedes = {
      relation: {
        data_source_id: dataSourceId,
        type: "single_property",
        single_property: {},
      },
    };
  }
  return properties;
}

export function skillsProperties(): Record<string, unknown> {
  return {
    Name: { title: {} },
    "When to use": { rich_text: {} },
    Steps: { rich_text: {} },
    Status: select(STATUSES),
  };
}

export function titleProperty(text: string): Record<string, unknown> {
  return { title: [{ type: "text", text: { content: text } }] };
}

export function richTextProperty(text: string): Record<string, unknown> {
  return { rich_text: [{ type: "text", text: { content: text } }] };
}

export function selectProperty(name: string): Record<string, unknown> {
  return { select: { name } };
}
