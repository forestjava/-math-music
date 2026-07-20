export interface NarratorReply {
  speech: string;
  openThread: string;
  closedThreads: string[];
}

/** Полный JSON-ответ рассказчика. */
export function parseNarratorReply(text: string): NarratorReply {
  const parsed = JSON.parse(text) as {
    speech: string;
    openThread?: string;
    closedThreads?: string[];
  };
  return {
    speech: parsed.speech,
    openThread: parsed.openThread ?? "",
    closedThreads: parsed.closedThreads ?? [],
  };
}

/** Текст для TTS: поле speech из JSON-ответа. */
export function extractSpeechBlock(text: string): string {
  return parseNarratorReply(text).speech;
}
