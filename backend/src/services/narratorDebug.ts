import { synthesize, type SynthesizeResult } from "./yandexTts.js";

export interface NarrateDebugParams {
  prompt: string;
  speed: number;
}

/** Извлекает опознавательный фрагмент из промпта (текст в «кавычках»). */
function extractMarker(prompt: string): string | null {
  const match = prompt.match(/«([^»]+)»/);
  return match ? match[1] : null;
}

/**
 * Отладочная озвучка: промпт не передаётся LLM, вместо него
 * синтезируется короткая тестовая фраза для проверки канала нарратора.
 */
export async function narrateDebug(params: NarrateDebugParams): Promise<SynthesizeResult> {
  const marker = extractMarker(params.prompt);
  const text = marker
    ? `Здесь рассказчик произнесёт слова про «${marker}».`
    : "Здесь рассказчик произнесёт вступительные или заключительные слова.";

  return synthesize({ text, speed: params.speed });
}
