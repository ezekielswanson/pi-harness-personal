export type ErrorCategory =
  | "auth"
  | "permission"
  | "validation"
  | "not_found"
  | "rate_limit"
  | "cancelled"
  | "timeout"
  | "unknown";

export type Completeness = "complete" | "partial";

export interface ResultMeta {
  source: string;
  system: string;
  operation: string;
}

export type ConnectorResult<T> = ResultMeta & {
  links?: string[];
  completeness?: Completeness;
} & (
    | { ok: true; data: T }
    | { ok: false; error: string; errorCategory: ErrorCategory; uncertain?: boolean }
  );
