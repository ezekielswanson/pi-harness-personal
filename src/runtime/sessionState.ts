let sessionId = "session";

export function setSessionId(id: string): void {
  const trimmed = id.trim();
  sessionId = trimmed || "session";
}

export function getSessionId(): string {
  return sessionId;
}
