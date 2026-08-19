import { readFileSync } from "node:fs";

const PROMPT_URL = new URL("./prompt.md", import.meta.url);

let cached: string | null = null;

export function loadTimelinePrompt(): string {
  if (cached === null) {
    cached = readFileSync(PROMPT_URL, "utf8").trim();
  }
  return cached;
}
