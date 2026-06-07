export type Interval =
  | "betaDescent"
  | "alphaDescent"
  | "thetaDescent"
  | "deltaDescent"
  | "deltaPlateau"
  | "deltaAscent"
  | "thetaAscent"
  | "alphaAscent"
  | "betaAscent";

export interface IntervalDefinition {
  id: Interval;
  label: string;
  segments: number;
  rhythmStart: number;
  rhythmEnd: number;
  carrierMultiplier: number;
  /**
   * Слот вершины пирамиды в начале / конце интервала (0…5).
   * Gain и частоты ссылаются на одну и ту же вершину; роль пика
   * переходит между осцилляторами — прежний разгоняется, затухает, уступает место.
   */
  gainPeakSlotStart: number;
  gainPeakSlotEnd: number;
  /** Минимальная пауза между фразами нарратора в этом интервале (сек). */
  narratorPauseSeconds: number;
  /** Скорость речи нарратора в этом интервале (Yandex TTS speed). */
  narratorSpeed: number;
}

/** 2+4+6+8+10+4+3+2+1 = 40 отрезков — режим «мягкий». */
export const SOFT_SESSION_INTERVALS: IntervalDefinition[] = [
  {
    id: "betaDescent",
    label: "Бета спуск",
    segments: 2,
    rhythmStart: 32,
    rhythmEnd: 16,
    carrierMultiplier: 8,
    gainPeakSlotStart: 0,
    gainPeakSlotEnd: 1,
    narratorPauseSeconds: 64,
    narratorSpeed: 0.95,
  },
  {
    id: "alphaDescent",
    label: "Альфа спуск",
    segments: 4,
    rhythmStart: 16,
    rhythmEnd: 8,
    carrierMultiplier: 16,
    gainPeakSlotStart: 1,
    gainPeakSlotEnd: 2,
    narratorPauseSeconds: 32,
    narratorSpeed: 0.9,
  },
  {
    id: "thetaDescent",
    label: "Тета спуск",
    segments: 6,
    rhythmStart: 8,
    rhythmEnd: 4,
    carrierMultiplier: 32,
    gainPeakSlotStart: 2,
    gainPeakSlotEnd: 3,
    narratorPauseSeconds: 16,
    narratorSpeed: 0.85,
  },
  {
    id: "deltaDescent",
    label: "Дельта спуск",
    segments: 8,
    rhythmStart: 4,
    rhythmEnd: 0.5,
    carrierMultiplier: 64,
    gainPeakSlotStart: 3,
    gainPeakSlotEnd: 3,
    narratorPauseSeconds: 8,
    narratorSpeed: 0.8,
  },
  {
    id: "deltaPlateau",
    label: "Дельта плато",
    segments: 10,
    rhythmStart: 0.5,
    rhythmEnd: 0.5,
    carrierMultiplier: 64,
    gainPeakSlotStart: 3,
    gainPeakSlotEnd: 3,
    narratorPauseSeconds: 4,
    narratorSpeed: 0.75,
  },
  {
    id: "deltaAscent",
    label: "Дельта подъём",
    segments: 4,
    rhythmStart: 0.5,
    rhythmEnd: 4,
    carrierMultiplier: 64,
    gainPeakSlotStart: 3,
    gainPeakSlotEnd: 3,
    narratorPauseSeconds: 8,
    narratorSpeed: 0.8,
  },
  {
    id: "thetaAscent",
    label: "Тета подъём",
    segments: 3,
    rhythmStart: 4,
    rhythmEnd: 8,
    carrierMultiplier: 32,
    gainPeakSlotStart: 3,
    gainPeakSlotEnd: 2,
    narratorPauseSeconds: 16,
    narratorSpeed: 0.85,
  },
  {
    id: "alphaAscent",
    label: "Альфа подъём",
    segments: 2,
    rhythmStart: 8,
    rhythmEnd: 16,
    carrierMultiplier: 16,
    gainPeakSlotStart: 2,
    gainPeakSlotEnd: 1,
    narratorPauseSeconds: 32,
    narratorSpeed: 0.9,
  },
  {
    id: "betaAscent",
    label: "Бета подъём",
    segments: 1,
    rhythmStart: 16,
    rhythmEnd: 32,
    carrierMultiplier: 8,
    gainPeakSlotStart: 1,
    gainPeakSlotEnd: 0,
    narratorPauseSeconds: 64,
    narratorSpeed: 0.95,
  },
];

/** 1+2+3+4+10+8+6+4+2 = 40 отрезков — режим «быстрый». */
export const FAST_SESSION_INTERVALS: IntervalDefinition[] = [
  {
    id: "betaDescent",
    label: "Бета спуск",
    segments: 1,
    rhythmStart: 32,
    rhythmEnd: 16,
    carrierMultiplier: 8,
    gainPeakSlotStart: 0,
    gainPeakSlotEnd: 1,
    narratorPauseSeconds: 64,
    narratorSpeed: 0.95,
  },
  {
    id: "alphaDescent",
    label: "Альфа спуск",
    segments: 2,
    rhythmStart: 16,
    rhythmEnd: 8,
    carrierMultiplier: 16,
    gainPeakSlotStart: 1,
    gainPeakSlotEnd: 2,
    narratorPauseSeconds: 32,
    narratorSpeed: 0.9,
  },
  {
    id: "thetaDescent",
    label: "Тета спуск",
    segments: 3,
    rhythmStart: 8,
    rhythmEnd: 4,
    carrierMultiplier: 32,
    gainPeakSlotStart: 2,
    gainPeakSlotEnd: 3,
    narratorPauseSeconds: 16,
    narratorSpeed: 0.85,
  },
  {
    id: "deltaDescent",
    label: "Дельта спуск",
    segments: 4,
    rhythmStart: 4,
    rhythmEnd: 0.5,
    carrierMultiplier: 64,
    gainPeakSlotStart: 3,
    gainPeakSlotEnd: 3,
    narratorPauseSeconds: 8,
    narratorSpeed: 0.8,
  },
  {
    id: "deltaPlateau",
    label: "Дельта плато",
    segments: 10,
    rhythmStart: 0.5,
    rhythmEnd: 0.5,
    carrierMultiplier: 64,
    gainPeakSlotStart: 3,
    gainPeakSlotEnd: 3,
    narratorPauseSeconds: 4,
    narratorSpeed: 0.75,
  },
  {
    id: "deltaAscent",
    label: "Дельта подъём",
    segments: 8,
    rhythmStart: 0.5,
    rhythmEnd: 4,
    carrierMultiplier: 64,
    gainPeakSlotStart: 3,
    gainPeakSlotEnd: 3,
    narratorPauseSeconds: 8,
    narratorSpeed: 0.8,
  },
  {
    id: "thetaAscent",
    label: "Тета подъём",
    segments: 6,
    rhythmStart: 4,
    rhythmEnd: 8,
    carrierMultiplier: 32,
    gainPeakSlotStart: 3,
    gainPeakSlotEnd: 2,
    narratorPauseSeconds: 16,
    narratorSpeed: 0.85,
  },
  {
    id: "alphaAscent",
    label: "Альфа подъём",
    segments: 4,
    rhythmStart: 8,
    rhythmEnd: 16,
    carrierMultiplier: 16,
    gainPeakSlotStart: 2,
    gainPeakSlotEnd: 1,
    narratorPauseSeconds: 32,
    narratorSpeed: 0.9,
  },
  {
    id: "betaAscent",
    label: "Бета подъём",
    segments: 2,
    rhythmStart: 16,
    rhythmEnd: 32,
    carrierMultiplier: 8,
    gainPeakSlotStart: 1,
    gainPeakSlotEnd: 0,
    narratorPauseSeconds: 64,
    narratorSpeed: 0.95,
  },
];

export function totalSegments(intervals: IntervalDefinition[]): number {
  return intervals.reduce((sum, interval) => sum + interval.segments, 0);
}
