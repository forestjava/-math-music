export type Interval =
  | "world"
  | "call"
  | "threshold"
  | "trials"
  | "ordeal"
  | "reward"
  | "homing"
  | "resurrection"
  | "return";

export type SessionAct = "setup" | "confrontation" | "resolution";

export type SessionPhase = "descent" | "plateau" | "ascent";

export interface IntervalDefinition {
  id: Interval;
  label: string;
  /** Смысл интервала на русском — для промптов и UI. */
  meaning: string;
  act: SessionAct;
  /** Стадии Воглера для этого интервала — устоявшиеся термины для промптов. */
  voglerStages: string;
  /** Стадии Кэмпбелла для этого интервала — оригинальные английские названия. */
  campbellStages: string;
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

const ASCENT_INTERVALS: ReadonlySet<Interval> = new Set([
  "reward",
  "homing",
  "resurrection",
  "return",
]);

export function sessionPhaseForInterval(id: Interval): SessionPhase {
  if (id === "ordeal") return "plateau";
  if (ASCENT_INTERVALS.has(id)) return "ascent";
  return "descent";
}

/** 2+4+6+8+10+4+3+2+1 = 40 отрезков — режим «мягкий». */
export const SOFT_SESSION_INTERVALS: IntervalDefinition[] = [
  {
    id: "world",
    label: "Мир",
    meaning: "Экспозиция обычного мира и первый зов",
    act: "setup",
    voglerStages: "1. The Ordinary World",
    campbellStages: "-",
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
    id: "call",
    label: "Призыв",
    meaning: "Призыв, отказ, появление проводника",
    act: "setup",
    voglerStages: "2. The Call to Adventure, 3. Refusal of the Call",
    campbellStages: "1. The Call to Adventure, 2. Refusal of the Call",
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
    id: "threshold",
    label: "Порог",
    meaning: "Пересечение порога и растворение старой идентичности",
    act: "setup",
    voglerStages: "4. Meeting with the Mentor, 5. Crossing the First Threshold",
    campbellStages:
      "3. Supernatural Aid, 4. The Crossing of the First Threshold, 5. The Belly of the Whale",
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
    id: "trials",
    label: "Испытания",
    meaning: "Испытания, союзники, враги, нарастание напряжения",
    act: "confrontation",
    voglerStages: "6. Tests, Allies, and Enemies, 7. Approach (to the Innermost Cave)",
    campbellStages:
      "6. The Road of Trials, 7. The Meeting with the Goddess, 8. Woman as the Temptress",
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
    id: "ordeal",
    label: "Ордалия",
    meaning: "Центральный кризис, апофеоз, перелом",
    act: "confrontation",
    voglerStages: "8. The Ordeal",
    campbellStages: "9. Atonement with the Father, 10. Apotheosis",
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
    id: "reward",
    label: "Дар",
    meaning: "Обретение дара и намерение вернуться",
    act: "confrontation",
    voglerStages: "9. Reward (Seizing the Sword)",
    campbellStages: "11. The Ultimate Boon",
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
    id: "homing",
    label: "Возврат",
    meaning: "Обратный путь, убывание опасности",
    act: "resolution",
    voglerStages: "10. The Road Back",
    campbellStages: "12. Refusal of the Return, 13. The Magic Flight, 14. Rescue from Without",
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
    id: "resurrection",
    label: "Воскрешение",
    meaning: "Финальная угроза и последний выбор",
    act: "resolution",
    voglerStages: "11. The Resurrection",
    campbellStages: "15. The Crossing of the Return Threshold",
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
    id: "return",
    label: "Финал",
    meaning: "Интеграция и финальный образ",
    act: "resolution",
    voglerStages: "12. Return with the Elixir",
    campbellStages: "16. Master of Two Worlds, 17. Freedom to Live",
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
    id: "world",
    label: "Мир",
    meaning: "Экспозиция обычного мира и первый зов",
    act: "setup",
    voglerStages: "1. The Ordinary World",
    campbellStages: "-",
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
    id: "call",
    label: "Призыв",
    meaning: "Призыв, отказ, появление проводника",
    act: "setup",
    voglerStages: "2. The Call to Adventure, 3. Refusal of the Call",
    campbellStages: "1. The Call to Adventure, 2. Refusal of the Call",
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
    id: "threshold",
    label: "Порог",
    meaning: "Пересечение порога и растворение старой идентичности",
    act: "setup",
    voglerStages: "4. Meeting with the Mentor, 5. Crossing the First Threshold",
    campbellStages:
      "3. Supernatural Aid, 4. The Crossing of the First Threshold, 5. The Belly of the Whale",
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
    id: "trials",
    label: "Испытания",
    meaning: "Испытания, союзники, враги, нарастание напряжения",
    act: "confrontation",
    voglerStages: "6. Tests, Allies, and Enemies, 7. Approach (to the Innermost Cave)",
    campbellStages:
      "6. The Road of Trials, 7. The Meeting with the Goddess, 8. Woman as the Temptress",
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
    id: "ordeal",
    label: "Ордалия",
    meaning: "Центральный кризис, апофеоз, перелом",
    act: "confrontation",
    voglerStages: "8. The Ordeal",
    campbellStages: "9. Atonement with the Father, 10. Apotheosis",
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
    id: "reward",
    label: "Дар",
    meaning: "Обретение дара и намерение вернуться",
    act: "confrontation",
    voglerStages: "9. Reward (Seizing the Sword)",
    campbellStages: "11. The Ultimate Boon",
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
    id: "homing",
    label: "Возврат",
    meaning: "Обратный путь, убывание опасности",
    act: "resolution",
    voglerStages: "10. The Road Back",
    campbellStages: "12. Refusal of the Return, 13. The Magic Flight, 14. Rescue from Without",
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
    id: "resurrection",
    label: "Воскрешение",
    meaning: "Финальная угроза и последний выбор",
    act: "resolution",
    voglerStages: "11. The Resurrection",
    campbellStages: "15. The Crossing of the Return Threshold",
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
    id: "return",
    label: "Финал",
    meaning: "Интеграция и финальный образ",
    act: "resolution",
    voglerStages: "12. Return with the Elixir",
    campbellStages: "16. Master of Two Worlds, 17. Freedom to Live",
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

export function actSegmentCounts(
  intervals: IntervalDefinition[],
): Record<SessionAct, number> {
  const counts: Record<SessionAct, number> = {
    setup: 0,
    confrontation: 0,
    resolution: 0,
  };
  for (const interval of intervals) {
    counts[interval.act] += interval.segments;
  }
  return counts;
}
