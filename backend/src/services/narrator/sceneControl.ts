import type { Scene } from "./scene.js";

/** Более короткие клаузы не считаются повтором (междометия, связки). */
const MIN_CLAUSE_CHARS = 24;

/**
 * Контроль залипания поиском буквальных вхождений:
 * action — всегда новое событие, сцена — изменение характеристик, speech — без дословных фраз.
 * Возвращает retry-промпт или пустую строку, если сцена чистая.
 */
export function detectSceneViolations(storyline: Scene[], candidate: Scene): string {
  const problems: string[] = [];

  const repeatedActionAt = storyline.findIndex((scene) =>
    overlaps(scene.action, candidate.action),
  );
  if (repeatedActionAt >= 0) {
    problems.push(
      `action повторяет событие сцены ${repeatedActionAt + 1} — соверши новое действие, которого ещё не было в истории.`,
    );
  }

  const previous = storyline.at(-1);
  if (previous && !sceneChanged(previous, candidate)) {
    problems.push(
      "Сцена не изменилась: измени одну или более характеристик (location, time, characters, objects, action) и художественно озвучь изменение.",
    );
  }

  const repeatedSpeechAt = findRepeatedClause(storyline, candidate.speech);
  if (repeatedSpeechAt >= 0) {
    problems.push(
      `speech дословно повторяет фразу сцены ${repeatedSpeechAt + 1} — расскажи новую сцену новыми словами.`,
    );
  }

  return problems.join(" ");
}

/** Буквальное вхождение: короткая строка целиком содержится в длинной. */
function overlaps(a: string, b: string): boolean {
  const x = normalize(a);
  const y = normalize(b);
  if (!x || !y) return false;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  return long.includes(short);
}

function sceneChanged(previous: Scene, next: Scene): boolean {
  return (
    normalize(previous.location) !== normalize(next.location) ||
    normalize(previous.time) !== normalize(next.time) ||
    normalize(previous.action) !== normalize(next.action) ||
    !sameList(previous.characters, next.characters) ||
    !sameList(previous.objects, next.objects)
  );
}

/** Индекс сцены, чья клауза дословно вошла в candidate speech, или -1. */
function findRepeatedClause(storyline: Scene[], candidateSpeech: string): number {
  const candidate = normalize(candidateSpeech);
  if (!candidate) return -1;

  return storyline.findIndex((scene) =>
    splitClauses(scene.speech).some(
      (clause) => clause.length >= MIN_CLAUSE_CHARS && candidate.includes(clause),
    ),
  );
}

function splitClauses(text: string): string[] {
  return normalize(text)
    .split(/[.!?…;,:]|—/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function sameList(a: string[], b: string[]): boolean {
  const setA = new Set(a.map(normalize));
  const setB = new Set(b.map(normalize));
  return setA.size === setB.size && [...setA].every((x) => setB.has(x));
}

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}
