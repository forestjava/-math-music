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
import { buildTurnMessages } from "./buildTurnMessages.js";
import { generateNarration } from "./perplexityClient.js";
import { parseScene, type Scene } from "./scene.js";
import { detectSceneViolations } from "./sceneControl.js";
import { commitScene, getStoryline } from "./storylineStore.js";

export interface NarrateParams {
  sessionId: string;
  prompt: string;
  speed: number;
}

const announcedLogFiles = new Set<string>();

/** Сколько раз подряд можно запросить перегенерацию сцены из‑за нарушений. */
const MAX_BAN_RETRIES = 4;

/**
 * Оркестратор хода рассказчика: контекст из storyline → генерация сцены →
 * retry при нарушениях (лимит исчерпан — сцена идёт как есть) → коммит → озвучание.
 */
export async function narrate(params: NarrateParams): Promise<SynthesizeResult> {
  const storyline = getStoryline(params.sessionId);
  if (!storyline) {
    throw new Error(`Сессия ${params.sessionId} не найдена`);
  }

  // Retry-обмены живут только в этом массиве и в storyline не попадают.
  const messages = buildTurnMessages(storyline, params.prompt);

  let text = await generateNarration(messages);
  logNarratorExchange(params.sessionId, params.prompt, text);
  let scene = parseScene(text);

  for (let attempt = 1; attempt <= MAX_BAN_RETRIES; attempt++) {
    const retryPrompt = collectViolations(storyline, scene);
    if (!retryPrompt) break;

    const userContent = `Предыдущий ответ отвергнут (попытка ${attempt}/${MAX_BAN_RETRIES}). Причина: ${retryPrompt}`;
    messages.push(
      { role: "assistant", content: text },
      { role: "user", content: userContent },
    );
    text = await generateNarration(messages);
    logNarratorExchange(params.sessionId, userContent, text);
    scene = parseScene(text);
  }

  commitScene(params.sessionId, scene);

  return synthesize({ text: scene.speech, speed: params.speed });
}

/** Все нарушения сцены одним retry-промптом; пустая строка — сцена чистая. */
function collectViolations(storyline: Scene[], scene: Scene): string {
  const apophasisHits = detectApophasis(scene.speech);
  const labelHits = detectBannedLabel(scene.speech);
  const metaHits = detectBannedMetaTerm(scene.speech);

  return [
    detectSceneViolations(storyline, scene),
    apophasisHits.length > 0 ? buildApophasisRetryPrompt(apophasisHits) : "",
    labelHits.length > 0 ? buildBannedLabelRetryPrompt(labelHits) : "",
    metaHits.length > 0 ? buildBannedMetaRetryPrompt(metaHits) : "",
  ]
    .filter(Boolean)
    .join(" ");
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
