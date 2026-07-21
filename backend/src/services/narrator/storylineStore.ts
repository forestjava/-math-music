import type { Scene } from "./scene.js";

/** storyline сеанса — история реализованных сцен (in-memory, по sessionId). */
const sessions = new Map<string, Scene[]>();

export function createSession(): string {
  const sessionId = globalThis.crypto.randomUUID();
  sessions.set(sessionId, []);
  return sessionId;
}

export function hasSession(sessionId: string): boolean {
  return sessions.has(sessionId);
}

export function getStoryline(sessionId: string): Scene[] | undefined {
  return sessions.get(sessionId);
}

export function commitScene(sessionId: string, scene: Scene): void {
  const storyline = sessions.get(sessionId);
  if (!storyline) {
    throw new Error(`Сессия ${sessionId} не найдена`);
  }
  storyline.push(scene);
}

export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}
