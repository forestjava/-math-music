import { extractSpeechBlock } from "./extractSpeechBlock.js";
import type { ChatMessage } from "./sessionStore.js";

export interface PhraseRecord {
  id: string;
  text: string;
}

export interface ExactRepeatSpan {
  sourcePhraseId: string;
  targetPhraseId: string;
  matchedText: string;
  score: number;
  reason: string;
}

export interface ExactDetectOptions {
  minExactChars: number;
  maxReturnedSpans: number;
  normalizeWhitespace: boolean;
  ignoreCase: boolean;
}

export interface ExactDetectResult {
  bannedFragments: ExactRepeatSpan[];
}

export const DEFAULT_OPTIONS: ExactDetectOptions = {
  minExactChars: 20,
  maxReturnedSpans: 10,
  normalizeWhitespace: true,
  ignoreCase: true,
};

export const CANDIDATE_PHRASE_ID = "candidate";

export function detectExactRepeatedFragments(
  history: PhraseRecord[],
  options: Partial<ExactDetectOptions> = {},
): ExactDetectResult {
  const cfg = { ...DEFAULT_OPTIONS, ...options };

  const prepared = history.map((p) => ({
    ...p,
    normalizedText: normalizeText(p.text, cfg),
  }));

  const matches: ExactRepeatSpan[] = [];

  for (let i = 0; i < prepared.length; i++) {
    for (let j = i + 1; j < prepared.length; j++) {
      const a = prepared[i]!;
      const b = prepared[j]!;

      const overlap = longestCommonSubstring(a.normalizedText, b.normalizedText);

      if (overlap.length >= cfg.minExactChars) {
        matches.push({
          sourcePhraseId: a.id,
          targetPhraseId: b.id,
          matchedText: overlap,
          score: overlap.length / Math.max(a.normalizedText.length, b.normalizedText.length, 1),
          reason: `Exact repeated fragment >= ${cfg.minExactChars} chars`,
        });
      }
    }
  }

  return {
    bannedFragments: dedupeAndRank(matches).slice(0, cfg.maxReturnedSpans),
  };
}

/** Преобразует exact-повторы в список строк для запрета в retry-prompt. */
export function buildExactGenerationGuards(result: ExactDetectResult): string[] {
  return result.bannedFragments
    .map((x) => x.matchedText.trim())
    .filter((x) => x.length > 0);
}

/** Все speech из assistant-сообщений сессии (без лимита). */
export function collectSpeechHistory(messages: ChatMessage[]): PhraseRecord[] {
  const records: PhraseRecord[] = [];
  let index = 0;
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    const speech = extractSpeechBlock(msg.content);
    if (!speech) continue;
    records.push({ id: `speech-${index}`, text: speech });
    index++;
  }
  return records;
}

/** Spans, где участвует candidate, → banned-строки. */
export function bannedFragmentsForCandidate(
  prior: PhraseRecord[],
  candidateSpeech: string,
  options?: Partial<ExactDetectOptions>,
): string[] {
  const history = [...prior, { id: CANDIDATE_PHRASE_ID, text: candidateSpeech }];
  const result = detectExactRepeatedFragments(history, options);
  const involvingCandidate: ExactDetectResult = {
    bannedFragments: result.bannedFragments.filter(
      (span) =>
        span.sourcePhraseId === CANDIDATE_PHRASE_ID ||
        span.targetPhraseId === CANDIDATE_PHRASE_ID,
    ),
  };
  return buildExactGenerationGuards(involvingCandidate);
}

export function buildExactRetryPrompt(bannedExactFragments: string[]): string {
  const list =
    bannedExactFragments.length > 0
      ? bannedExactFragments.map((f) => `«${f}»`).join("; ")
      : "точные фрагменты из прошлых speech";
  return (
    `speech содержит точные дословные фрагменты из прошлых ответов, что категорически запрещено: ${list}. ` +
    `Запрещено повторять ранее озвученные реплики и их близкие парафразы. ` // согласно строке 8 системного промпта
  );
}

function normalizeText(text: string, cfg: ExactDetectOptions): string {
  let out = text;

  if (cfg.ignoreCase) {
    out = out.toLowerCase();
  }

  if (cfg.normalizeWhitespace) {
    out = out.replace(/\s+/g, " ").trim();
  }

  return out;
}

function dedupeAndRank(items: ExactRepeatSpan[]): ExactRepeatSpan[] {
  const map = new Map<string, ExactRepeatSpan>();

  for (const item of items) {
    const key = [item.sourcePhraseId, item.targetPhraseId, item.matchedText.slice(0, 200)].join(
      "|",
    );

    const prev = map.get(key);
    if (!prev || prev.score < item.score) {
      map.set(key, item);
    }
  }

  return [...map.values()].sort((a, b) => b.score - a.score);
}

function longestCommonSubstring(a: string, b: string): string {
  if (!a || !b) return "";

  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0),
  );

  let maxLen = 0;
  let endIndex = 0;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]! + 1;

        if (dp[i]![j]! > maxLen) {
          maxLen = dp[i]![j]!;
          endIndex = i;
        }
      } else {
        dp[i]![j] = 0;
      }
    }
  }

  return a.slice(endIndex - maxLen, endIndex).trim();
}
