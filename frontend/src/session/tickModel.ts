import { getActiveSessionRuntime } from "./activeRuntime";

/** Период одного тика = 1 / текущий ритм (сек). */
export function tickPeriodSeconds(rhythmHz: number): number {
  return 1 / rhythmHz;
}

export function tickPeriodAtElapsed(elapsedSeconds: number): number {
  const runtime = getActiveSessionRuntime();
  const position = runtime.getIntervalPosition(elapsedSeconds);
  return tickPeriodSeconds(runtime.getRhythmAt(position));
}

/**
 * Сколько тиков укладывается в [0, duration], если на каждом тике период = 1/rhythm(t).
 * Используется для отладки; проигрывание идёт непрерывно по накопленному времени.
 */
export function estimateTickCount(): number {
  const runtime = getActiveSessionRuntime();
  let elapsed = 0;
  let ticks = 0;

  while (elapsed < runtime.durationSeconds) {
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
  const runtime = getActiveSessionRuntime();
  const startPhase = runtime.sessionPhaseElapsed(absoluteElapsed);

  if (!runtime.settings.loop && startPhase >= runtime.durationSeconds - 1e-12) {
    return {
      index: -1,
      startElapsed: absoluteElapsed,
      endElapsed: absoluteElapsed,
      periodSeconds: 0,
    };
  }

  const period = tickPeriodAtElapsed(startPhase);
  const endPhase = startPhase + period;

  if (endPhase <= runtime.durationSeconds + 1e-12) {
    return {
      index: -1,
      startElapsed: absoluteElapsed,
      endElapsed: absoluteElapsed + period,
      periodSeconds: period,
    };
  }

  const toBoundary = runtime.durationSeconds - startPhase;
  return {
    index: -1,
    startElapsed: absoluteElapsed,
    endElapsed: absoluteElapsed + toBoundary,
    periodSeconds: toBoundary,
  };
}

/** Начало тика, в котором находится `absoluteElapsed` (для resume). */
export function alignToTickStart(absoluteElapsed: number): number {
  const runtime = getActiveSessionRuntime();
  const phase = runtime.sessionPhaseElapsed(absoluteElapsed);
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
  const runtime = getActiveSessionRuntime();
  let elapsed = 0;
  let index = 0;

  while (elapsed < runtime.durationSeconds) {
    const tick = nextTickAfter(elapsed);
    yield { ...tick, index };
    if (tick.periodSeconds <= 0) break;
    elapsed = tick.endElapsed;
    index += 1;
  }
}
