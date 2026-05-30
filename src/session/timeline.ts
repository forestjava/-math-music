import {
  DURATION_SECONDS,
  INTERVALS,
  SEGMENT_DURATION,
  type IntervalDefinition,
  type IntervalKind,
  type IntervalPosition,
  type SessionSnapshot,
} from "./config";
export { DURATION_SECONDS, INTERVALS, SEGMENT_DURATION };

export type { IntervalDefinition, IntervalKind, IntervalPosition, SessionSnapshot };
const PLATEAU_INTERVAL_INDEX = 3;
const PLATEAU_TRANSITION_SEGMENTS = 8;
const PLATEAU_DESCENT_4_TO_1 = 3;
const PLATEAU_DESCENT_1_TO_05 = 1;
const PLATEAU_ASCENT_05_TO_1 = 1;
const PLATEAU_ASCENT_1_TO_4 = 3;

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

function deltaPlateauRhythm(progress: number): number {
  const totalSegments = INTERVALS[PLATEAU_INTERVAL_INDEX].segments;
  const holdSegments = totalSegments - PLATEAU_TRANSITION_SEGMENTS;
  const segmentProgress = progress * totalSegments;
  if (segmentProgress < PLATEAU_DESCENT_4_TO_1) {
    return lerp(4, 1, segmentProgress / PLATEAU_DESCENT_4_TO_1);
  }

  if (segmentProgress < PLATEAU_DESCENT_4_TO_1 + PLATEAU_DESCENT_1_TO_05) {
    return lerp(1, 0.5, segmentProgress - PLATEAU_DESCENT_4_TO_1);
  }

  if (segmentProgress < PLATEAU_DESCENT_4_TO_1 + PLATEAU_DESCENT_1_TO_05 + holdSegments) {
    return 0.5;
  }

  if (
    segmentProgress <
    PLATEAU_DESCENT_4_TO_1 + PLATEAU_DESCENT_1_TO_05 + holdSegments + PLATEAU_ASCENT_05_TO_1
  ) {
    return lerp(
      0.5,
      1,
      segmentProgress - PLATEAU_DESCENT_4_TO_1 - PLATEAU_DESCENT_1_TO_05 - holdSegments,
    );
  }

  return lerp(
    1,
    4,

    (segmentProgress -
      PLATEAU_DESCENT_4_TO_1 -
      PLATEAU_DESCENT_1_TO_05 -
      holdSegments -
      PLATEAU_ASCENT_05_TO_1) /
      PLATEAU_ASCENT_1_TO_4,
  );
}

export function getRhythmAt(position: IntervalPosition): number {
  if (position.interval.kind === "deltaPlateau") {
    return deltaPlateauRhythm(position.progress);
  }

  return lerp(position.interval.rhythmStart, position.interval.rhythmEnd, position.progress);
}

export function carrierCenterAt(intervalIndex: number, progress: number): number {
  const interval = INTERVALS[intervalIndex];
  const rhythm =
    interval.kind === "deltaPlateau"
      ? deltaPlateauRhythm(progress)
      : lerp(interval.rhythmStart, interval.rhythmEnd, progress);
  return rhythm * interval.carrierMultiplier;
}

export function carrierBoundary(intervalIndex: number, atStart: boolean): number {
  const interval = INTERVALS[intervalIndex];
  const rhythm = atStart ? interval.rhythmStart : interval.rhythmEnd;
  return rhythm * interval.carrierMultiplier;
}

export function getSessionSnapshot(elapsedSeconds: number): SessionSnapshot {
  const position = getIntervalPosition(elapsedSeconds);
  const rhythm = getRhythmAt(position);
  const carrier = carrierCenterAt(position.intervalIndex, position.progress);
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

export const DESCENT_INTERVAL_COUNT = 3;

export const PLATEAU_INDEX = PLATEAU_INTERVAL_INDEX;

export const ASCENT_INTERVAL_START = 4;
