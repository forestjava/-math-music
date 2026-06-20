import { loadSystemPrompt } from "./systemPrompt.js";
import { trimMessages } from "./trimMessages.js";

export type ChatRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

/** Полный массив messages сеанса (system + история) по sessionId (in-memory). */
const sessions = new Map<string, ChatMessage[]>();

export function createSession(): string {
  const sessionId = globalThis.crypto.randomUUID();
  sessions.set(sessionId, [{ role: "system", content: loadSystemPrompt() }]);
  return sessionId;
}

export function hasSession(sessionId: string): boolean {
  return sessions.has(sessionId);
}

export function getMessages(sessionId: string): ChatMessage[] | undefined {
  return sessions.get(sessionId);
}

export function appendMessage(sessionId: string, message: ChatMessage): void {
  const messages = sessions.get(sessionId);
  if (!messages) {
    throw new Error(`Сессия ${sessionId} не найдена`);
  }

  messages.push(message);
  trimMessages(messages);
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}
