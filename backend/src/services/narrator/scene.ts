/** Реализованная сцена истории: атомарные синтаксические роли + художественное воплощение. */
export interface Scene {
  location: string;
  time: string;
  characters: string[];
  objects: string[];
  action: string;
  speech: string;
  sessionNotes: string[];
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

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((x): x is string => typeof x === "string")
    : [];
}

/** JSON-ответ рассказчика → Scene. */
export function parseScene(text: string): Scene {
  const parsed = JSON.parse(unwrapJsonFence(text)) as {
    location?: string;
    time?: string;
    characters?: unknown;
    objects?: unknown;
    action?: string;
    speech?: string;
    sessionNotes?: unknown;
  };
  return {
    location: parsed.location ?? "",
    time: parsed.time ?? "",
    characters: stringArray(parsed.characters),
    objects: stringArray(parsed.objects),
    action: parsed.action ?? "",
    speech: stripMarkdownMarkup(parsed.speech ?? ""),
    sessionNotes: stringArray(parsed.sessionNotes),
  };
}
