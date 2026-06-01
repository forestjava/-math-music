import { DURATION_SECONDS } from "./duration";
import { getIntervalPosition, getRhythmAt } from "./timeline";

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

/** Следующий тик решётки с границы `elapsed` (один шаг, без массива). */
export function nextTickAfter(elapsed: number): SessionTick | null {
  if (elapsed >= DURATION_SECONDS) return null;

  const startElapsed = Math.max(0, elapsed);
  const period = tickPeriodAtElapsed(startElapsed);
  const endElapsed = Math.min(DURATION_SECONDS, startElapsed + period);

  return {
    index: -1,
    startElapsed,
    endElapsed,
    periodSeconds: endElapsed - startElapsed,
  };
}

/** Начало тика, в котором находится `elapsed` (для resume). */
export function alignToTickStart(elapsed: number): number {
  const clamped = Math.max(0, Math.min(elapsed, DURATION_SECONDS));
  if (clamped <= 0) return 0;

  let cursor = 0;
  while (cursor < clamped) {
    const tick = nextTickAfter(cursor);
    if (!tick || tick.endElapsed > clamped + 1e-9) return cursor;
    cursor = tick.endElapsed;
  }

  return cursor;
}

/** Генератор тиков сессии — только отладка и boundary scripts, не для play(). */
export function* iterateSessionTicks(): Generator<SessionTick> {
  let elapsed = 0;
  let index = 0;

  while (elapsed < DURATION_SECONDS) {
    const tick = nextTickAfter(elapsed);
    if (!tick) break;
    yield { ...tick, index };
    elapsed = tick.endElapsed;
    index += 1;
  }
}
