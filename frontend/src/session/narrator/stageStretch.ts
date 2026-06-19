import type { IntervalDefinition } from "../intervals";

export type IntervalSubStage = "setup" | "confrontation" | "resolution";

export type MicroActVerb = "entered" | "continues";

export interface IntervalTiming {
  intervalStartElapsed: number;
  intervalDuration: number;
  elapsedInInterval: number;
  remainingInInterval: number;
  progressPercent: number;
}

export interface StageStretchContinueParams {
  elapsed: number;
  interval: IntervalDefinition;
  timing: IntervalTiming;
  phraseIndex: number;
  previousSubStage: IntervalSubStage | null;
  isFirstContinue: boolean;
  formatElapsed: (seconds: number) => string;
}

export interface StageStretchContinueResult {
  prompt: string;
  subStage: IntervalSubStage;
  verb: MicroActVerb;
}

const CONTINUE_PHRASE_COUNT = 4;

const CONTINUE_PHRASES = [
  "продолжай погружение - вернись к отсылкам в системном промпте - там огромное количество глубинных концепций, ждущих своего проявления и воплощения в слова разворачивающейся истории",
  "сохраняя связность, найди новые детали, ещё один содержательный элемент и добавь следующий естественный сюжетный ход",
  "работай как писатель: развивай события, персонажей, описывай и меняй локации, время, предметы, действия",
  "поищи новые примеры воплощения, развивай сюжет дальше внутри стадии",
  "сделай блоки озвучания на данной стадии ещё продолжительнее: найди ещё больше материала для этапа, сделай фразы ещё сложнее",
] as const;

export function resolveIntervalSubStage(progressPercent: number): IntervalSubStage {
  if (progressPercent < 25) return "setup";
  if (progressPercent < 75) return "confrontation";
  return "resolution";
}

export function resolveMicroActVerb(
  currentSubStage: IntervalSubStage,
  previousSubStage: IntervalSubStage | null,
): MicroActVerb {
  return previousSubStage === currentSubStage ? "continues" : "entered";
}

function formatSubStageLabel(intervalId: string, subStage: IntervalSubStage): string {
  return `${intervalId}:${subStage}`;
}

function buildMicroActStructureBlock(
  interval: IntervalDefinition,
  timing: IntervalTiming,
  formatElapsed: (seconds: number) => string,
): string {
  const { intervalStartElapsed, intervalDuration } = timing;
  const confrontationStart = intervalStartElapsed + intervalDuration * 0.25;
  const resolutionStart = intervalStartElapsed + intervalDuration * 0.75;

  return (
    `стадия ${interval.id} может иметь внутри себя собственный сценарий, ` +
    `описывающий изменения вложенными микроактами, не выходящий впрочем из рамки смысла «${interval.meaning}»:\n` +
    `[${formatElapsed(intervalStartElapsed)}] «${interval.id}:setup» (четверть объёма стадии)\n` +
    `[${formatElapsed(confrontationStart)}] «${interval.id}:confrontation» (половина объёма, т.е. до 75% времени стадии)\n` +
    `[${formatElapsed(resolutionStart)}] «${interval.id}:resolution»`
  );
}

function buildDeepeningPreamble(
  elapsed: number,
  interval: IntervalDefinition,
  timing: IntervalTiming,
  formatElapsed: (seconds: number) => string,
): string {
  return (
    `[${formatElapsed(elapsed)}] клиент углубляет стадию «${interval.id}».\n` +
    `В текущей стадии прошло: ${formatElapsed(timing.elapsedInInterval)} (${timing.progressPercent}%), ` +
    `осталось: ${formatElapsed(timing.remainingInInterval)}.\n` +
    `${buildMicroActStructureBlock(interval, timing, formatElapsed)}\n` +
    `Найди в интернете пример сюжетного углубления стадии «${interval.label}», распланируй тайминг: используй новый материал, ` +
    `чтобы заполнить оставшиеся ${formatElapsed(timing.remainingInInterval)}.\n` +
    `Не повторяй уже сказанное, а новые фразы в блоке озвучания {...} сделай длиннее, насыщеннее, подробнее для данной стадии.\n`
  );
}

function buildMicroActActionLine(
  verb: MicroActVerb,
  subStageLabel: string,
  phraseIndex: number,
): string {
  if (verb === "entered") {
    return `Найди пример «${subStageLabel}», перескажи`;
  }

  return `Не повторяй предыдущие фразы, ${CONTINUE_PHRASES[phraseIndex % CONTINUE_PHRASE_COUNT]}, продолжай рассказывать историю`;
}

function buildMicroActHeader(
  elapsed: number,
  intervalId: string,
  subStage: IntervalSubStage,
  verb: MicroActVerb,
  timing: IntervalTiming,
  formatElapsed: (seconds: number) => string,
): string {
  const subStageLabel = formatSubStageLabel(intervalId, subStage);
  const verbPhrase = verb === "entered" ? "вошёл в" : "продолжает";

  return (
    `[${formatElapsed(elapsed)}] клиент ${verbPhrase} «${subStageLabel}»\n` +
    `заполнено ${timing.progressPercent}% времени стадии.\n`

    // `Прошло ${formatElapsed(timing.elapsedInInterval)} (${timing.progressPercent}%), ` +
    // `осталось ${formatElapsed(timing.remainingInInterval)}.\n`
  );
}

export function buildStageStretchContinuePrompt(
  params: StageStretchContinueParams,
): StageStretchContinueResult {
  const { elapsed, interval, timing, phraseIndex, previousSubStage, isFirstContinue, formatElapsed } =
    params;

  const subStage = resolveIntervalSubStage(timing.progressPercent);
  const verb = resolveMicroActVerb(subStage, previousSubStage);
  const subStageLabel = formatSubStageLabel(interval.id, subStage);

  let prompt = "";

  if (isFirstContinue) {
    prompt += buildDeepeningPreamble(elapsed, interval, timing, formatElapsed);
    prompt += "\n";
  }

  prompt += buildMicroActHeader(elapsed, interval.id, subStage, verb, timing, formatElapsed);
  prompt += buildMicroActActionLine(verb, subStageLabel, phraseIndex);

  return { prompt, subStage, verb };
}
