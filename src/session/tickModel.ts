import { DURATION_SECONDS } from "./duration";
import { getIntervalPosition, getRhythmAt, sessionPhaseElapsed } from "./timeline";

/** Период одного тика = 1 / текущий ритм (сек). */
export function tickPeriodSeconds(rhythmHz: number): number {
  return 1 / rhythmHz;
}

export function tickPeriodAtElapsed(elapsedSeconds: number): number {
  const position = getIntervalPosition(elapsedSeconds);
  return tickPeriodSeconds(getRhythmAt(position));
}

/**
 * Сколько тиков укладывается в [0, duration], если на каждом тике период = 1/rhythm(t).
 * Используется для отладки; проигрывание идёт непрерывно по накопленному времени.
 */
export function estimateTickCount(): number {
  let elapsed = 0;
  let ticks = 0;

  while (elapsed < DURATION_SECONDS) {
    ticks += 1;
    elapsed += tickPeriodAtElapsed(elapsed);
  }

  return ticks;
}

export interface SessionTick {
  index: number;
  startElapsed: number;
  endElapsed: number;
  periodSeconds: number;
}

/** Следующий тик решётки с границы `absoluteElapsed` (один шаг, без массива). */
export function nextTickAfter(absoluteElapsed: number): SessionTick {
  const startPhase = sessionPhaseElapsed(absoluteElapsed);
  const period = tickPeriodAtElapsed(startPhase);
  const endPhase = startPhase + period;

  if (endPhase <= DURATION_SECONDS + 1e-12) {
    return {
      index: -1,
      startElapsed: absoluteElapsed,
      endElapsed: absoluteElapsed + period,
      periodSeconds: period,
    };
  }

  const toBoundary = DURATION_SECONDS - startPhase;
  return {
    index: -1,
    startElapsed: absoluteElapsed,
    endElapsed: absoluteElapsed + toBoundary,
    periodSeconds: toBoundary,
  };
}

/** Начало тика, в котором находится `absoluteElapsed` (для resume). */
export function alignToTickStart(absoluteElapsed: number): number {
  const phase = sessionPhaseElapsed(absoluteElapsed);
  const cycleBase = absoluteElapsed - phase;
  if (phase <= 0) return cycleBase;

  let cursor = cycleBase;
  const limit = cycleBase + phase + 1e-9;
  while (cursor < limit) {
    const tick = nextTickAfter(cursor);
    if (tick.endElapsed > absoluteElapsed + 1e-9) {
      return tick.startElapsed;
    }
    cursor = tick.endElapsed;
  }

  return cycleBase;
}

/** Генератор тиков сессии — только отладка и boundary scripts, не для play(). */
export function* iterateSessionTicks(): Generator<SessionTick> {
  let elapsed = 0;
  let index = 0;

  while (elapsed < DURATION_SECONDS) {
    const tick = nextTickAfter(elapsed);
    yield { ...tick, index };
    elapsed = tick.endElapsed;
    index += 1;
  }
}
