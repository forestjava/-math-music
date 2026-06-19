import { readFileSync } from "node:fs";

const SYSTEM_PROMPT_URL = new URL("./SYSTEM.DAP.txt", import.meta.url);

let cached: string | null = null;

export function loadSystemPrompt(): string {
  if (cached === null) {
    cached = readFileSync(SYSTEM_PROMPT_URL, "utf8").trim();
  }
  return cached;
}
