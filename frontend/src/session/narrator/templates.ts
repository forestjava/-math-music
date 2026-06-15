import type { IntervalDefinition, SessionAct } from "../intervals";
import type { SessionRuntime } from "../runtime";
import {
  buildStageStretchContinuePrompt,
  type IntervalSubStage,
  type StageStretchContinueResult,
} from "./stageStretch";

const ACT_LABELS: Record<SessionAct, string> = {
  setup: "Act I setup",
  confrontation: "Act II confrontation",
  resolution: "Act III resolution",
};

/** hh:mm:ss — прошедшее время от старта сессии. */
export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function isFirstIntervalInAct(runtime: SessionRuntime, intervalIndex: number): boolean {
  if (intervalIndex === 0) return true;
  return runtime.intervals[intervalIndex].act !== runtime.intervals[intervalIndex - 1].act;
}

function formatActIntervalSchedule(runtime: SessionRuntime, act: SessionAct): string {
  const lines: string[] = [];
  for (let i = 0; i < runtime.intervals.length; i++) {
    const interval = runtime.intervals[i];
    if (interval.act !== act) continue;
    lines.push(
      `[${formatElapsed(runtime.intervalStartElapsed(i))}] «${interval.id}» ${interval.meaning}`,
    );
  }
  return lines.join("\n");
}

function intervalTiming(
  runtime: SessionRuntime,
  elapsed: number,
  intervalIndex: number,
) {
  const intervalStart = runtime.intervalStartElapsed(intervalIndex);
  const intervalDuration = runtime.intervalDurationAt(intervalIndex);
  const elapsedInInterval = Math.max(0, elapsed - intervalStart);
  const remainingInInterval = Math.max(0, intervalDuration - elapsedInInterval);
  const progressPercent =
    intervalDuration > 0
      ? Math.min(100, Math.round((elapsedInInterval / intervalDuration) * 100))
      : 100;

  return {
    intervalStartElapsed: intervalStart,
    intervalDuration,
    elapsedInInterval,
    remainingInInterval,
    progressPercent,
  };
}

export function sessionStartPrompt(runtime: SessionRuntime): string {
  const { settings } = runtime;
  const actIIStart = runtime.actStartElapsed("confrontation");
  const actIIIStart = runtime.actStartElapsed("resolution");

  return (
    `В блоке озвучания {...} подготовь клиента к началу сессии аудиальных эффектов, ` +
    `лаконично попроси комфортно разместиться во времени и пространстве.\n\n` +
    `Клиент инициировал сессию длительностью ${settings.durationMinutes} минут. ` +
    `В заметках распланируй сюжетную линию и структуру нарратива ` +
    `как three-act structure (трёхактная структура, декомпозируемая на 12 стадий по Воглеру ` +
    `или на 17 stages of the journey по Кэмпбеллу). ` +
    `Кратко наметь сеттинг, способ реализации структуры нарратива в нём, 
    формы проявления конкретных деталей мира, персонажей, 
    событий...\n` +
    `Тайминг трёх актов:\n` +
    `[${formatElapsed(0)}] Act I «setup» (экспозиция, завязка; separation / departure)\n` +
    `[${formatElapsed(actIIStart)}] Act II «confrontation» (rising action, столкновение; initiation)\n` +
    `[${formatElapsed(actIIIStart)}] Act III «resolution» (climax & denouement, развязка; return)\n` +
    `Теперь ты не описываешь структуру истории вообще — ты её воплощаешь в частности.`
  );
}

export function intervalEnterPrompt(
  runtime: SessionRuntime,
  elapsed: number,
  interval: IntervalDefinition,
  intervalIndex: number,
): string {
  let prompt = "";

  if (isFirstIntervalInAct(runtime, intervalIndex)) {
    prompt += `Тайминг трёх стадий акта «${ACT_LABELS[interval.act]}»:\n${formatActIntervalSchedule(runtime, interval.act)}\n\n`;
  }

  prompt +=
    `[${formatElapsed(elapsed)}] клиент переходит в стадию «${interval.id}».\n` +
    `Смысл: ${interval.meaning}\n` +
    `По Воглеру: ${interval.voglerStages}\n` +
    `По Кэмпбеллу: ${interval.campbellStages}\n` +
    `Найди в интернете частный пример проявления стадии «${interval.label}», используй его как основу, ` +
    `реализуй стадию «${interval.label}» в текущем сеттинге, буквально начни рассказывать конкретную сцену, ` +
    `дай в первом озвучиваемом блоке данной стадии первые 2-4 небольшие фразы предстоящего поворота истории`;

  return prompt;
}

export function intervalContinuePrompt(
  runtime: SessionRuntime,
  elapsed: number,
  interval: IntervalDefinition,
  intervalIndex: number,
  phraseIndex: number,
  previousSubStage: IntervalSubStage | null,
  isFirstContinue: boolean,
): StageStretchContinueResult {
  return buildStageStretchContinuePrompt({
    elapsed,
    interval,
    timing: intervalTiming(runtime, elapsed, intervalIndex),
    phraseIndex,
    previousSubStage,
    isFirstContinue,
    formatElapsed,
  });
}

export function sessionEndPrompt(elapsed: number): string {
  return (
    `[${formatElapsed(elapsed)}] клиент завершил сессию.\n` +
    `Выведи последний блок для клиента — закрепи полученный опыт и мягко верни его в настоящее.`
  );
}
