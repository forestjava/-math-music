import type { ChatMessage } from "./chatMessage.js";
import type { Scene } from "./scene.js";
import { loadSystemPrompt } from "./systemPrompt.js";

/** Сколько последних speech передаётся дословно для непрерывности тона. */
const VERBATIM_SPEECHES = 2;

/** Контекст хода: SYSTEM + storyline-летопись + директива шага. */
export function buildTurnMessages(storyline: Scene[], directive: string): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "system", content: loadSystemPrompt() }];

  if (storyline.length > 0) {
    messages.push({ role: "user", content: buildChronicle(storyline) });
  }

  messages.push({ role: "user", content: directive });

  return messages;
}

function buildChronicle(storyline: Scene[]): string {
  const sections = [
    "storyline — история реализованных сцен (ведётся сервером), не повторяй их:\n" +
      storyline.map(formatScene).join("\n"),
  ];

  const lastNotes = storyline.at(-1)!.sessionNotes;
  if (lastNotes.length > 0) {
    sections.push(
      "sessionNotes последней сцены:\n" + lastNotes.map((n) => `- ${n}`).join("\n"),
    );
  }

  const lastSpeeches = storyline.slice(-VERBATIM_SPEECHES).map((s) => s.speech);
  sections.push(
    "Последние озвученные speech — продолжай этот нарратив непрерывно:\n" +
      lastSpeeches.map((s, i) => `${i + 1}) ${s}`).join("\n"),
  );

  return sections.join("\n\n");
}

function formatScene(scene: Scene, index: number): string {
  return (
    `${index + 1}. [${scene.location} — ${scene.time}] ` +
    `${scene.characters.join(", ")} | ${scene.objects.join(", ")} | ${scene.action}`
  );
}
