import { readPersonalConfig } from "../config/personalConfig.ts";
import { notionFetch } from "../notion/client.ts";
import { getSessionId } from "../runtime/sessionState.ts";
import { resolveMemoriesDataSourceId } from "./recall.ts";
import { MEMORY_SCOPES, MEMORY_TYPES, richTextProperty, selectProperty, STATUSES, type MemoryScope, type MemoryType, type VaultStatus } from "./schema.ts";

export interface RememberInput {
  fact: string;
  scope: MemoryScope;
  type: MemoryType;
  source?: string;
  status?: VaultStatus;
  supersedes?: string;
  today?: string;
  sessionId?: string;
}

function todayIso(date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function todayStamp(date = new Date()): string {
  return todayIso(date);
}

function oneOf<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if ((allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`${label} must be one of: ${allowed.join(", ")}.`);
}

export function rememberProperties(input: RememberInput): Record<string, unknown> {
  const fact = input.fact.trim();
  if (!fact) throw new Error("fact is required.");
  const scope = oneOf(input.scope, MEMORY_SCOPES, "scope");
  const type = oneOf(input.type, MEMORY_TYPES, "type");
  const status = oneOf(input.status ?? "Active", STATUSES, "status");
  const source = (input.source?.trim() || `pi:${input.sessionId?.trim() || getSessionId()}`).trim();
  const properties: Record<string, unknown> = {
    Fact: { title: [{ type: "text", text: { content: fact } }] },
    Scope: selectProperty(scope),
    Type: selectProperty(type),
    Source: richTextProperty(source),
    Date: { date: { start: input.today ?? todayIso() } },
    Status: selectProperty(status),
  };
  const supersedes = input.supersedes?.trim();
  if (supersedes) properties.Supersedes = { relation: [{ id: supersedes }] };
  return properties;
}

export async function rememberFact(root: string, input: RememberInput, fetchImpl: typeof fetch = fetch): Promise<{ id: string; url: string }> {
  const { vault } = readPersonalConfig(root);
  if (!vault.memoriesDbId) throw new Error("Vault not set up: run vault_setup");
  const dataSourceId = await resolveMemoriesDataSourceId(vault.memoriesDbId, fetchImpl);
  const payload = await notionFetch(
    "/pages",
    {
      method: "POST",
      idempotent: false,
      body: {
        parent: { type: "data_source_id", data_source_id: dataSourceId },
        properties: rememberProperties(input),
      },
    },
    fetchImpl,
  );
  const record = payload as { id?: unknown; url?: unknown };
  return {
    id: typeof record.id === "string" ? record.id : "",
    url: typeof record.url === "string" ? record.url : "",
  };
}
