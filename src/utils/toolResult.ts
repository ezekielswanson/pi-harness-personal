export function toolText(value: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
    details: value,
  };
}

export function toolError(message: string) {
  const details = { ok: false as const, error: message };
  return {
    content: [{ type: "text" as const, text: JSON.stringify(details, null, 2) }],
    details,
    isError: true as const,
  };
}

export function markFailedToolResult(toolName: string, details: unknown): { isError: true } | undefined {
  if (!toolName.startsWith("vault_")) return undefined;
  if (typeof details === "object" && details !== null && "ok" in details && details.ok === false) {
    return { isError: true };
  }
  return undefined;
}
