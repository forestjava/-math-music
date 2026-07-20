import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { synthesize, type SynthesizeResult } from "../yandexTts.js";
import { parseNarratorReply } from "./extractSpeechBlock.js";
import {
  bannedFragmentsForCandidate,
  bannedFragmentsForOpenThread,
  buildClosedThreadRetryPrompt,
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

const announcedLogFiles = new Set<string>();

/**
 * Оркестратор фразы рассказчика: добавляет запрос в историю сеанса,
 * генерирует текст через Sonar, при exact-повторах делает retry, озвучивает итог.
 */
export async function narrate(params: NarrateParams): Promise<SynthesizeResult> {
  const messages = getMessages(params.sessionId);
  if (!messages) {
    throw new Error(`Сессия ${params.sessionId} не найдена`);
  }

  const userMessage: ChatMessage = { role: "user", content: params.prompt };
  appendMessage(params.sessionId, userMessage);

  const priorSpeeches = collectSpeechHistory(messages);

  // 1) Получить reply
  let text = await generateNarration(messages);
  logNarratorExchange(params.sessionId, params.prompt, text);

  let reply = parseNarratorReply(text);

  // 2) Exact-повтор speech относительно priorSpeeches
  const speechBanned = bannedFragmentsForCandidate(priorSpeeches, reply.speech);
  if (speechBanned.length > 0) {
    const retryPrompt = buildExactRetryPrompt(speechBanned);
    appendMessage(params.sessionId, { role: "user", content: retryPrompt });

    text = await generateNarration(messages);
    logNarratorExchange(params.sessionId, retryPrompt, text);

    reply = parseNarratorReply(text);
  }

  // 3) Exact-пересечение openThread с closedThreads (чёрный список)
  const threadBanned = bannedFragmentsForOpenThread(reply.closedThreads, reply.openThread);
  if (threadBanned.length > 0) {
    const retryPrompt = buildClosedThreadRetryPrompt(threadBanned);
    appendMessage(params.sessionId, { role: "user", content: retryPrompt });

    text = await generateNarration(messages);
    logNarratorExchange(params.sessionId, retryPrompt, text);

    reply = parseNarratorReply(text);
  }

  appendMessage(params.sessionId, { role: "assistant", content: text });

  return synthesize({ text: reply.speech, speed: params.speed });
}

function isNarratorLogEnabled(): boolean {
  const value = process.env.NARRATOR_LOG?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function narratorLogPath(sessionId: string): string {
  const dir = join(process.cwd(), "logs");
  mkdirSync(dir, { recursive: true });
  return join(dir, `narrator-${sessionId}.log`);
}

function logNarratorExchange(sessionId: string, prompt: string, response: string): void {
  if (!isNarratorLogEnabled()) return;

  const logPath = narratorLogPath(sessionId);
  const border = "=".repeat(72);
  const rule = "-".repeat(72);

  const block = [
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
  ].join("\n");

  // appendFileSync открывает/пишет/закрывает — flush на диск после каждой записи
  appendFileSync(logPath, block, "utf8");

  if (!announcedLogFiles.has(logPath)) {
    announcedLogFiles.add(logPath);
    console.log(`[narrator] лог сессии: ${logPath}`);
  }
}
