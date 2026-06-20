import type { ChatMessage } from "./sessionStore.js";

const HEAD_SIZE = 3;
const MAX_HISTORY_MESSAGES = 64;

const GAP_USER: ChatMessage = {
  role: "user",
  content:
    "... Пропущены промежуточные сообщения для соблюдения лимита API ...",
};

/** Обрезает массив messages на месте: сохраняет [0..2], служебное user, последние 64. */
export function trimMessages(messages: ChatMessage[]): void {
  if (messages.length <= HEAD_SIZE + MAX_HISTORY_MESSAGES) {
    return;
  }

  messages.splice(
    HEAD_SIZE,
    messages.length - HEAD_SIZE - MAX_HISTORY_MESSAGES,
    GAP_USER,
  );
}
