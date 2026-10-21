import { readPersonalConfig } from "../config/personalConfig.ts";
import { notionFetch } from "../notion/client.ts";
import type { MemoryScope, MemoryType } from "./schema.ts";

export interface RecallQuery {
  text?: string;
  scope?: MemoryScope;
  type?: MemoryType;
  limit?: number;
  includeRetired?: boolean;
}

export interface MemoryRow {
  fact: string;
  scope: string;
  type: string;
  date: string;
  url: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function plainTitle(value: unknown): string {
  if (!isRecord(value) || !Array.isArray(value.title)) return "";
  return value.title
    .map((part) => (isRecord(part) && typeof part.plain_text === "string" ? part.plain_text : ""))
    .join("")
    .trim();
}

function selectName(value: unknown): string {
  if (!isRecord(value) || !isRecord(value.select) || typeof value.select.name !== "string") return "";
  return value.select.name;
}

function dateStart(value: unknown): string {
  if (!isRecord(value) || !isRecord(value.date) || typeof value.date.start !== "string") return "";
  return value.date.start;
}

export function buildRecallFilter(query: RecallQuery): Record<string, unknown> | undefined {
  const clauses: Record<string, unknown>[] = [];
  const text = query.text?.trim();
  if (text) clauses.push({ property: "Fact", title: { contains: text } });
  if (query.scope) clauses.push({ property: "Scope", select: { equals: query.scope } });
  if (query.type) clauses.push({ property: "Type", select: { equals: query.type } });
  if (!query.includeRetired) {
    clauses.push({
      or: [
        { property: "Status", select: { does_not_equal: "Retired" } },
        { property: "Status", select: { is_empty: true } },
      ],
    });
  }
  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return { and: clauses };
}

export function parseRecallPage(page: unknown): MemoryRow | null {
  if (!isRecord(page) || !isRecord(page.properties)) return null;
  const props = page.properties;
  const fact = plainTitle(props.Fact);
  if (!fact) return null;
  return {
    fact,
    scope: selectName(props.Scope),
    type: selectName(props.Type),
    date: dateStart(props.Date),
    url: typeof page.url === "string" ? page.url : "",
  };
}

export function dataSourceIdFromDatabase(payload: unknown): string {
  if (!isRecord(payload) || !Array.isArray(payload.data_sources) || payload.data_sources.length === 0) {
    throw new Error("Memories database has no data source.");
  }
  const first = payload.data_sources[0];
  if (!isRecord(first) || typeof first.id !== "string" || !first.id.trim()) {
    throw new Error("Memories database has no data source.");
  }
  return first.id.trim();
}

export async function resolveMemoriesDataSourceId(databaseId: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const payload = await notionFetch(`/databases/${databaseId}`, { method: "GET" }, fetchImpl);
  return dataSourceIdFromDatabase(payload);
}

export async function recallMemories(root: string, query: RecallQuery, fetchImpl: typeof fetch = fetch): Promise<MemoryRow[]> {
  const { vault } = readPersonalConfig(root);
  if (!vault.memoriesDbId) throw new Error("Vault not set up: run vault_setup");
  const dataSourceId = await resolveMemoriesDataSourceId(vault.memoriesDbId, fetchImpl);
  const limit = query.limit ?? 10;
  const filter = buildRecallFilter(query);
  const body: Record<string, unknown> = {
    sorts: [{ property: "Date", direction: "descending" }],
    page_size: limit,
  };
  if (filter) body.filter = filter;
  const payload = await notionFetch(`/data_sources/${dataSourceId}/query`, { method: "POST", body, idempotent: true }, fetchImpl);
  if (!isRecord(payload) || !Array.isArray(payload.results)) return [];
  return payload.results.map(parseRecallPage).filter((row): row is MemoryRow => row !== null);
}
