import { synthesize, type SynthesizeResult } from "../yandexTts.js";
import { extractSpeechBlock } from "./extractSpeechBlock.js";
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

  logNarratorExchange(params.sessionId, params.prompt, text);

  appendMessage(params.sessionId, userMessage);
  appendMessage(params.sessionId, { role: "assistant", content: text });

  const speechText = extractSpeechBlock(text);
  if (!speechText) {
    throw new Error("В ответе LLM нет блока озвучания {...}");
  }

  return synthesize({ text: speechText, speed: params.speed });
}

function isNarratorLogEnabled(): boolean {
  const value = process.env.NARRATOR_LOG?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function logNarratorExchange(sessionId: string, prompt: string, response: string): void {
  if (!isNarratorLogEnabled()) return;

  const border = "=".repeat(72);
  const rule = "-".repeat(72);

  console.log(
    [
      "",
      border,
      `[narrator] сессия ${sessionId}`,
      rule,
      "USER:",
      prompt,
      rule,
      "ASSISTANT:",
      response,
      border,
      "",
    ].join("\n"),
  );
}
