export {
  DURATION_MINUTES,
  DURATION_SECONDS,
  SEGMENT_COUNT,
  SEGMENT_DURATION,
} from "./duration";

export {
  INTERVALS,
  INTERVAL_COUNT,
  DESCENT_INTERVAL_COUNT,
  DELTA_DESCENT_INDEX,
  DELTA_ASCENT_INDEX,
  PLATEAU_INTERVAL_INDEX,
  ASCENT_INTERVAL_START,
  THETA_ASCENT_INDEX,
  type IntervalDefinition,
} from "./intervals";

export type IntervalKind =
  | "betaDescent"
  | "alphaDescent"
  | "thetaDescent"
  | "deltaDescent"
  | "deltaPlateau"
  | "deltaAscent"
  | "thetaAscent"
  | "alphaAscent"
  | "betaAscent";

export const INTERVAL_LABELS: Record<IntervalKind, string> = {
  betaDescent: "Бета спуск",
  alphaDescent: "Альфа спуск",
  thetaDescent: "Тета спуск",
  deltaDescent: "Дельта спуск",
  deltaPlateau: "Дельта плато",
  deltaAscent: "Дельта подъём",
  thetaAscent: "Тета подъём",
  alphaAscent: "Альфа подъём",
  betaAscent: "Бета подъём",
};

export {
  getIntervalPosition,
  getRhythmAt,
  getSessionSnapshot,
  intervalDuration,
  intervalDurationAt,
  intervalEndElapsed,
  lerp,
  type IntervalPosition,
  type SessionSnapshot,
} from "./timeline";
