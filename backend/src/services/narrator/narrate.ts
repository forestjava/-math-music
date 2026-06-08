import { synthesize, type SynthesizeResult } from "../yandexTts.js";
import { generateNarration } from "./perplexityClient.js";
import { appendMessage, getHistory, type ChatMessage } from "./sessionStore.js";
import { loadSystemPrompt } from "./systemPrompt.js";

export interface NarrateParams {
  sessionId: string;
  prompt: string;
  speed: number;
}

/**
 * Оркестратор фразы рассказчика: добавляет запрос в историю сеанса,
 * генерирует текст через Sonar, сохраняет ответ и озвучивает его.
 */
export async function narrate(params: NarrateParams): Promise<SynthesizeResult> {
  const history = getHistory(params.sessionId);
  if (!history) {
    throw new Error(`Сессия ${params.sessionId} не найдена`);
  }

  const userMessage: ChatMessage = { role: "user", content: params.prompt };

  const text = await generateNarration([
    { role: "system", content: loadSystemPrompt() },
    ...history,
    userMessage,
  ]);

  appendMessage(params.sessionId, userMessage);
  appendMessage(params.sessionId, { role: "assistant", content: text });

  return synthesize({ text, speed: params.speed });
}
