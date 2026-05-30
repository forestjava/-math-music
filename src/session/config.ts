/** Длительность сессии: 5–15 минут (можно изменить) */

export const DURATION_MINUTES = 1;

export const DURATION_SECONDS = DURATION_MINUTES * 60;

/** Отрезки — только мера длины интервалов (2+4+6+14+3+2+1) */

export const SEGMENT_COUNT = 32;

export const SEGMENT_DURATION = DURATION_SECONDS / SEGMENT_COUNT;

export type IntervalKind =
  | "betaDescent"
  | "alphaDescent"
  | "thetaDescent"
  | "deltaPlateau"
  | "thetaAscent"
  | "alphaAscent"
  | "betaAscent";

export interface IntervalDefinition {
  kind: IntervalKind;
  segments: number;
  rhythmStart: number;
  rhythmEnd: number;
  carrierMultiplier: number;
  isDescent: boolean;
  isAscent: boolean;
}

export const INTERVALS: IntervalDefinition[] = [
  {
    kind: "betaDescent",
    segments: 2,
    rhythmStart: 32,
    rhythmEnd: 16,
    carrierMultiplier: 16,
    isDescent: true,
    isAscent: false,
  },
  {
    kind: "alphaDescent",
    segments: 4,
    rhythmStart: 16,
    rhythmEnd: 8,
    carrierMultiplier: 32,
    isDescent: true,
    isAscent: false,
  },
  {
    kind: "thetaDescent",
    segments: 6,
    rhythmStart: 8,
    rhythmEnd: 4,
    carrierMultiplier: 64,
    isDescent: true,
    isAscent: false,
  },
  {
    kind: "deltaPlateau",
    segments: 14,
    rhythmStart: 4,
    rhythmEnd: 4,
    carrierMultiplier: 128,
    isDescent: false,
    isAscent: false,
  },
  {
    kind: "thetaAscent",
    segments: 3,
    rhythmStart: 4,
    rhythmEnd: 8,
    carrierMultiplier: 64,
    isDescent: false,
    isAscent: true,
  },
  {
    kind: "alphaAscent",
    segments: 2,
    rhythmStart: 8,
    rhythmEnd: 16,
    carrierMultiplier: 32,
    isDescent: false,
    isAscent: true,
  },
  {
    kind: "betaAscent",
    segments: 1,
    rhythmStart: 16,
    rhythmEnd: 32,
    carrierMultiplier: 16,
    isDescent: false,
    isAscent: true,
  },
];

export const INTERVAL_LABELS: Record<IntervalKind, string> = {
  betaDescent: "Бета спуск",
  alphaDescent: "Альфа спуск",
  thetaDescent: "Тета спуск",
  deltaPlateau: "Дельта плато",
  thetaAscent: "Тета подъём",
  alphaAscent: "Альфа подъём",
  betaAscent: "Бета подъём",
};

export interface IntervalPosition {
  interval: IntervalDefinition;
  intervalIndex: number;

  /** 0..1, непрерывный прогресс внутри интервала */
  progress: number;

  /** секунда начала интервала */
  startElapsed: number;

  /** длительность интервала в секундах */
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

export { getIntervalPosition, getRhythmAt, getSessionSnapshot } from "./timeline";
