/** Первый блок {...} из ответа LLM — только его текст идёт в TTS. */
export function extractSpeechBlock(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;

  const end = text.indexOf("}", start + 1);
  if (end === -1) return null;

  const block = text.slice(start + 1, end).trim();
  return block.length > 0 ? block : null;
}
