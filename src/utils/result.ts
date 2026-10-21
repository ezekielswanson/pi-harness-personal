import { randomUUID } from "node:crypto";
import type { ConnectorResult, ErrorCategory, ResultMeta } from "../types/index.ts";
import { categoryOf, errorMessage, sanitizeErrorMessage, UncertainWriteError } from "./errors.ts";

const runId = randomUUID();

export function getRunId(): string {
  return runId;
}

function scrub(value: string, secrets: readonly string[]): string {
  let text = value.replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  for (const secret of secrets) {
    if (secret.length >= 6) text = text.split(secret).join("[redacted]");
  }
  return text;
}

export function logCall(
  entry: {
    source: string;
    system: string;
    operation: string;
    ok: boolean;
    durationMs: number;
    errorCategory?: ErrorCategory | null;
    uncertain?: boolean;
  },
  secrets: readonly string[] = [],
  write: (line: string) => void = (line) => {
    console.error(line);
  },
): void {
  const payload = {
    ts: new Date().toISOString(),
    runId,
    source: entry.source,
    system: entry.system,
    operation: entry.operation,
    durationMs: entry.durationMs,
    result: entry.ok ? "ok" : "error",
    errorCategory: entry.errorCategory ?? null,
    uncertain: entry.uncertain === true,
  };
  write(`[pi-harness-personal] ${scrub(JSON.stringify(payload), secrets)}`);
}

export async function runOperation<T>(
  meta: ResultMeta,
  secrets: readonly string[],
  fn: () => Promise<T>,
  extras: Pick<ConnectorResult<T>, "links" | "completeness"> = {},
): Promise<ConnectorResult<T>> {
  const started = Date.now();
  try {
    const data = await fn();
    const result: ConnectorResult<T> = { ok: true, ...meta, ...extras, data };
    logCall({ ...meta, ok: true, durationMs: Date.now() - started }, secrets);
    return result;
  } catch (err) {
    const errorCategory = categoryOf(err);
    const uncertain = err instanceof UncertainWriteError || (err as { uncertain?: boolean }).uncertain === true;
    const result: ConnectorResult<T> = {
      ok: false,
      ...meta,
      errorCategory,
      error: sanitizeErrorMessage(err, secrets),
      uncertain: uncertain || undefined,
    };
    logCall({ ...meta, ok: false, durationMs: Date.now() - started, errorCategory, uncertain }, secrets);
    return result;
  }
}

export function failureMessage(err: unknown): string {
  return errorMessage(err);
}
