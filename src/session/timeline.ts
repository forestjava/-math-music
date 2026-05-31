import { DURATION_SECONDS, SEGMENT_DURATION } from "./duration";
import { INTERVALS, type IntervalDefinition } from "./intervals";
import { carrierCenterHz } from "./carrierPlan";

export { DURATION_SECONDS, SEGMENT_DURATION, INTERVALS };
export type { IntervalDefinition };

export interface IntervalPosition {
  interval: IntervalDefinition;
  intervalIndex: number;
  progress: number;
  startElapsed: number;
  duration: number;
}

export interface SessionSnapshot {
  elapsed: number;
  interval: IntervalDefinition;
  intervalIndex: number;
  intervalProgress: number;
  rhythm: number;
  carrier: number;
  leftCarrier: number;
  rightCarrier: number;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function intervalDuration(interval: IntervalDefinition): number {
  return interval.segments * SEGMENT_DURATION;
}

export function intervalDurationAt(index: number): number {
  return intervalDuration(INTERVALS[index]);
}

export function intervalEndElapsed(index: number): number {
  let elapsed = 0;
  for (let i = 0; i <= index; i++) {
    elapsed += intervalDurationAt(i);
  }
  return elapsed;
}

export function getIntervalPosition(elapsedSeconds: number): IntervalPosition {
  const elapsed = Math.max(0, Math.min(elapsedSeconds, DURATION_SECONDS));
  let startElapsed = 0;

  for (let intervalIndex = 0; intervalIndex < INTERVALS.length; intervalIndex++) {
    const interval = INTERVALS[intervalIndex];
    const duration = intervalDuration(interval);
    const endElapsed = startElapsed + duration;

    if (elapsed < endElapsed || intervalIndex === INTERVALS.length - 1) {
      const progress = duration > 0 ? (elapsed - startElapsed) / duration : 1;
      return {
        interval,
        intervalIndex,
        progress: Math.min(1, Math.max(0, progress)),
        startElapsed,
        duration,
      };
    }

    startElapsed = endElapsed;
  }

  const last = INTERVALS[INTERVALS.length - 1];
  return {
    interval: last,
    intervalIndex: INTERVALS.length - 1,
    progress: 1,
    startElapsed: DURATION_SECONDS - intervalDuration(last),
    duration: intervalDuration(last),
  };
}

export function getRhythmAt(position: IntervalPosition): number {
  const { interval, progress } = position;
  return lerp(interval.rhythmStart, interval.rhythmEnd, progress);
}

export function getSessionSnapshot(elapsedSeconds: number): SessionSnapshot {
  const position = getIntervalPosition(elapsedSeconds);
  const rhythm = getRhythmAt(position);
  const carrier = carrierCenterHz(position.intervalIndex, position.progress);
  const halfRhythm = rhythm / 2;

  return {
    elapsed: Math.max(0, Math.min(elapsedSeconds, DURATION_SECONDS)),
    interval: position.interval,
    intervalIndex: position.intervalIndex,
    intervalProgress: position.progress,
    rhythm,
    carrier,
    leftCarrier: carrier - halfRhythm,
    rightCarrier: carrier + halfRhythm,
  };
}
