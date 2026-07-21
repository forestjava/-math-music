import type { ChatMessage } from "./chatMessage.js";
import type { StorylineScene } from "./storylineStore.js";
import { loadSystemPrompt } from "./systemPrompt.js";

/** Сколько последних speech передаётся дословно для непрерывности тона. */
const VERBATIM_SPEECHES = 2;

/** Контекст хода: SYSTEM + storyline-летопись + директива шага. */
export function buildTurnMessages(
  storyline: StorylineScene[],
  directive: string,
): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "system", content: loadSystemPrompt() }];

  if (storyline.length > 0) {
    messages.push({ role: "user", content: buildChronicle(storyline) });
  }

  messages.push({ role: "user", content: directive });

  return messages;
}

function buildChronicle(storyline: StorylineScene[]): string {
  const sections = [
    "storyline — история реализованных сцен, не повторяй их:\n" +
      buildStorylineSection(storyline),
  ];

  const lastNotes = storyline.at(-1)!.sessionNotes;
  if (lastNotes.length > 0) {
    sections.push(
      "sessionNotes последней сцены:\n" + lastNotes.map((n) => `- ${n}`).join("\n"),
    );
  }

  const lastSpeeches = storyline.slice(-VERBATIM_SPEECHES).map((s) => s.speech);
  sections.push(
    "Последние озвученные speech — продолжай этот нарратив последовательно:\n" +
      lastSpeeches.map((s, i) => `${i + 1}) ${s}`).join("\n"),
  );

  return sections.join("\n\n");
}

/** Дерево: акт → стадия → сцены, вложенность отступами. */
function buildStorylineSection(storyline: StorylineScene[]): string {
  const lines: string[] = [];
  let act = "";
  let stage = "";

  storyline.forEach((scene, index) => {
    if (scene.act !== act) {
      act = scene.act;
      stage = "";
      if (act) lines.push(act);
    }
    if (scene.stage !== stage) {
      stage = scene.stage;
      if (stage) lines.push(`  стадия «${stage}»`);
    }
    const indent = stage ? "    " : act ? "  " : "";
    lines.push(indent + formatScene(scene, index));
  });

  return lines.join("\n");
}

function formatScene(scene: StorylineScene, index: number): string {
  return (
    `${index + 1}. [${scene.location} — ${scene.time}] ` +
    `${scene.characters.join(", ")} | ${scene.objects.join(", ")} | ${scene.action}`
  );
}
