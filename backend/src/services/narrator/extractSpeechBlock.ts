/** Убирает thinking-теги и маркеры цитат поиска из сырого ответа. */
export function stripNarratorNoise(text: string): string {
  return text
    .replace(/<\/?think>/gi, "")
    .replace(/\[\d+\]/g, "")
    .trim();
}

/** Извлекает первый сбалансированный JSON-объект из текста. */
function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function speechFromJson(text: string): string | null {
  const fenced = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const raw = extractJsonObject(fenced) ?? extractJsonObject(text);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      "speech" in parsed &&
      typeof (parsed as { speech: unknown }).speech === "string"
    ) {
      const speech = stripNarratorNoise((parsed as { speech: string }).speech);
      return speech.length > 0 ? speech : null;
    }
  } catch {
    return null;
  }
  return null;
}

/** Legacy: первый блок {...} с plain-текстом (не JSON). */
function speechFromLegacyBraces(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  const end = text.indexOf("}", start + 1);
  if (end === -1) return null;
  const block = stripNarratorNoise(text.slice(start + 1, end));
  if (!block || block.includes('"speech"')) return null;
  return block;
}

/** Текст для TTS: поле speech из JSON-ответа (с мягким fallback на старый {...}). */
export function extractSpeechBlock(text: string): string | null {
  const cleaned = stripNarratorNoise(text);
  return speechFromJson(cleaned) ?? speechFromLegacyBraces(cleaned);
}
