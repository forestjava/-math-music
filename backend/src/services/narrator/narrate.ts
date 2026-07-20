import { synthesize, type SynthesizeResult } from "../yandexTts.js";
import { extractSpeechBlock, stripNarratorNoise } from "./extractSpeechBlock.js";
import {
  bannedFragmentsForCandidate,
  buildExactRetryPrompt,
  collectSpeechHistory,
} from "./exactRepeatDetect.js";
import { generateNarration } from "./perplexityClient.js";
import { appendMessage, getMessages, type ChatMessage } from "./sessionStore.js";

export interface NarrateParams {
  sessionId: string;
  prompt: string;
  speed: number;
}

/**
 * Оркестратор фразы рассказчика: добавляет запрос в историю сеанса,
 * генерирует текст через Sonar, при exact-повторе speech делает один retry, озвучивает итог.
 */
export async function narrate(params: NarrateParams): Promise<SynthesizeResult> {
  const messages = getMessages(params.sessionId);
  if (!messages) {
    throw new Error(`Сессия ${params.sessionId} не найдена`);
  }

  const userMessage: ChatMessage = { role: "user", content: params.prompt };
  appendMessage(params.sessionId, userMessage);

  const priorSpeeches = collectSpeechHistory(messages);

  let text = stripNarratorNoise(await generateNarration(messages));
  logNarratorExchange(params.sessionId, params.prompt, text);

  let speechText = extractSpeechBlock(text);
  if (!speechText) {
    throw new Error("В ответе LLM нет поля speech");
  }

  const banned = bannedFragmentsForCandidate(priorSpeeches, speechText);
  if (banned.length > 0) {
    const retryPrompt = buildExactRetryPrompt(banned);
    appendMessage(params.sessionId, { role: "user", content: retryPrompt });

    text = stripNarratorNoise(await generateNarration(messages));
    logNarratorExchange(params.sessionId, retryPrompt, text);

    speechText = extractSpeechBlock(text);
    if (!speechText) {
      throw new Error("В ответе LLM нет поля speech");
    }
  }

  appendMessage(params.sessionId, { role: "assistant", content: text });

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
