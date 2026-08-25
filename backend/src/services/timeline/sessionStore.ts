import type { SessionScenario } from "./parseTts.js";

export interface SessionRecord {
  sessionId: string;
  perplexityResponseId: string;
  status: string;
  scenario?: SessionScenario;
  error?: string;
  agentOutput?: string;
}

const sessions = new Map<string, SessionRecord>();

export function saveSessionRecord(record: SessionRecord): void {
  sessions.set(record.sessionId, record);
}

export function getSessionRecord(sessionId: string): SessionRecord | undefined {
  return sessions.get(sessionId);
}

export function deleteSessionRecord(sessionId: string): SessionRecord | undefined {
  const record = sessions.get(sessionId);
  sessions.delete(sessionId);
  return record;
}
