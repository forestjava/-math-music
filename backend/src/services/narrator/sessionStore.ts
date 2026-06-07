export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** История мотивов сеанса по идентификатору сессии (in-memory). */
const sessions = new Map<string, ChatMessage[]>();

export function createSession(): string {
  const sessionId = globalThis.crypto.randomUUID();
  sessions.set(sessionId, []);
  return sessionId;
}

export function hasSession(sessionId: string): boolean {
  return sessions.has(sessionId);
}

export function getHistory(sessionId: string): ChatMessage[] | undefined {
  return sessions.get(sessionId);
}

export function appendMessage(sessionId: string, message: ChatMessage): void {
  const history = sessions.get(sessionId);
  if (!history) {
    throw new Error(`Сессия ${sessionId} не найдена`);
  }
  history.push(message);
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}
