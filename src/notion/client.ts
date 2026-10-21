import { HttpFailure, parseRetryAfter, sanitizeErrorMessage } from "../utils/errors.ts";
import { withRetry } from "../utils/retry.ts";

export const NOTION_VERSION = "2025-09-03";

export interface NotionRequest {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
  idempotent?: boolean;
}

type FetchImpl = typeof fetch;

function notionMessage(payload: unknown, status: number): string {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = (payload as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return sanitizeErrorMessage(message);
  }
  return `Notion request failed (${status}).`;
}

/** JSON Notion REST wrapper. Bearer token is NOTION_TOKEN. Does not log the token or the body. */
export async function notionFetch(path: string, init: NotionRequest = {}, fetchImpl: FetchImpl = fetch): Promise<unknown> {
  const token = process.env.NOTION_TOKEN?.trim();
  if (!token) throw new Error("NOTION_TOKEN is not set.");
  const method = init.method ?? "GET";
  const idempotent = init.idempotent ?? method === "GET";
  return withRetry(
    async () => {
      const response = await fetchImpl(`https://api.notion.com/v1${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: init.signal,
      });
      const text = await response.text();
      let payload: unknown = null;
      if (text) {
        try {
          payload = JSON.parse(text) as unknown;
        } catch {
          payload = { message: "Notion returned a non-JSON body." };
        }
      }
      if (!response.ok) {
        throw new HttpFailure(response.status, notionMessage(payload, response.status), parseRetryAfter(response.headers.get("retry-after")), idempotent);
      }
      return payload;
    },
    { idempotent, signal: init.signal },
  );
}
