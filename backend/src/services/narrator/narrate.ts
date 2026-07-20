import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { synthesize, type SynthesizeResult } from "../yandexTts.js";
import { buildApophasisRetryPrompt, detectApophasis } from "./apophasisDetect.js";
import {
  buildBannedLabelRetryPrompt,
  buildBannedMetaRetryPrompt,
  detectBannedLabel,
  detectBannedMetaTerm,
} from "./bannedLabelDetect.js";
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

/** Сколько раз подряд можно запросить перегенерацию reply из‑за нарушений. */
const MAX_BAN_RETRIES = 16;

/**
 * Оркестратор фразы рассказчика: добавляет запрос в историю сеанса,
 * генерирует текст через Sonar, при нарушениях делает retry, озвучивает итог.
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

  // 2) Проверки; при нарушениях — retry до чистого ответа или лимита
  let banRetry = 0;
  while (true) {
    const speechBanned = bannedFragmentsForCandidate(
      priorSpeeches,
      reply.speech,
      undefined,
      reply.characters,
    );
    const threadBanned = bannedFragmentsForOpenThread(reply.closedThreads, reply.openThread);
    const apophasisHits = detectApophasis(reply.speech);
    const bannedLabelHits = detectBannedLabel(reply.speech);
    const bannedMetaHits = detectBannedMetaTerm(reply.speech);

    const retryPrompt = [
      speechBanned.length > 0 ? buildExactRetryPrompt(speechBanned) : "",
      threadBanned.length > 0 ? buildClosedThreadRetryPrompt(threadBanned) : "",
      apophasisHits.length > 0 ? buildApophasisRetryPrompt(apophasisHits) : "",
      bannedLabelHits.length > 0 ? buildBannedLabelRetryPrompt(bannedLabelHits) : "",
      bannedMetaHits.length > 0 ? buildBannedMetaRetryPrompt(bannedMetaHits) : "",
    ].join("");

    if (!retryPrompt) break;
    if (banRetry >= MAX_BAN_RETRIES) {
      // лимит исчерпан — озвучиваем последний reply как есть
      break;
    }

    banRetry += 1;
    const userContent = `[попытка ${banRetry}/${MAX_BAN_RETRIES}] ${retryPrompt}`;
    appendMessage(params.sessionId, { role: "user", content: userContent });
    text = await generateNarration(messages);
    logNarratorExchange(params.sessionId, userContent, text);
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
