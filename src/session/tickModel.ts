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

/** Генератор тиков сессии (алгоритмический, без полного массива в памяти). */
export function* iterateSessionTicks(): Generator<SessionTick> {
  let elapsed = 0;
  let index = 0;

  while (elapsed < DURATION_SECONDS) {
    const period = tickPeriodAtElapsed(elapsed);
    const endElapsed = Math.min(DURATION_SECONDS, elapsed + period);
    yield { index, startElapsed: elapsed, endElapsed, periodSeconds: period };
    elapsed = endElapsed;
    index += 1;
  }
}
