import type { IntervalDefinition, SessionAct } from "../intervals";
import type { SessionRuntime } from "../runtime";
import { buildAntiRepeatRules, buildStageStretchContinuePrompt } from "./stageStretch";

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

export function sessionStartPrompt(runtime: SessionRuntime): string {
  const { settings } = runtime;

  return (
    `Клиент инициировал сессию длительностью ${settings.durationMinutes} минут. ` +
    `` + // TODO user preferences
    `Придумай оригинальный сеттинг и основу игрового мира в StoryState, но в speech пока только подготовь клиента — ` +
    `лаконично попроси комфортно разместиться телом и вниманием во времени и пространстве; пусть мир открывается постепенно и неожиданно по ходу сеанса.`
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
    prompt += `${ACT_LABELS[interval.act]}.\n`;
  }

  prompt +=
    `[${formatElapsed(elapsed)}] клиент переходит в стадию «${interval.id}».\n` +
    `Смысл стадии: ${interval.meaning} \n` +
    `По Воглеру: ${interval.voglerStages} \n` +
    `По Кэмпбеллу: ${interval.campbellStages} \n` +
    `${buildAntiRepeatRules()} ` +
    `Воплоти как новую сцену для стадии «${interval.label}»; ` +
    `в speech — первые 2–4 небольшие фразы поворота.`;

  return prompt;
}

export function intervalContinuePrompt(
  elapsed: number,
  interval: IntervalDefinition,
): string {
  return (
    `[${formatElapsed(elapsed)}] (клиент продолжает стадию «${interval.id}»)\n` +
    buildStageStretchContinuePrompt()
  );
}

export function sessionEndPrompt(elapsed: number): string {
  return (
    `[${formatElapsed(elapsed)}] клиент завершил сессию.\n` +
    `Перезапиши StoryState под закрытие: открытые нити перенеси в closedThreads. ` +
    `В speech — последний блок: кратко закрепи полученный опыт и мягко верни в настоящее.`
  );
}
