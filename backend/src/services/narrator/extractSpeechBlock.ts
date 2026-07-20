export interface NarratorReply {
  speech: string;
  openThread: string;
  closedThreads: string[];
}

/** Снимает ограждение ``` / ```json, если модель обернула JSON в fenced code block. */
function unwrapJsonFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```$/i);
  return match ? match[1]!.trim() : trimmed;
}

/** Убирает markdown-разметку из текста для TTS (*курсив*, **жирный**, `_`, `` ` ``). */
function stripMarkdownMarkup(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

/** Полный JSON-ответ рассказчика. */
export function parseNarratorReply(text: string): NarratorReply {
  const parsed = JSON.parse(unwrapJsonFence(text)) as {
    speech: string;
    openThread?: string;
    closedThreads?: string[];
  };
  return {
    speech: stripMarkdownMarkup(parsed.speech ?? ""),
    openThread: parsed.openThread ?? "",
    closedThreads: parsed.closedThreads ?? [],
  };
}

/** Текст для TTS: поле speech из JSON-ответа. */
export function extractSpeechBlock(text: string): string {
  return parseNarratorReply(text).speech;
}
