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

export type SessionAct = "I setup" | "II confrontation" | "III resolution";

export type SessionPhase = "descent" | "plateau" | "ascent";

export interface IntervalDefinition {
  act: SessionAct;
  id: Interval;
  phase: SessionPhase;

  /** Смысл интервала на русском — для промптов и UI. */
  label: string;
  meaning: string;
  
  /** Стадии Воглера и Кэмпбелла для этого интервала — устоявшиеся термины для промптов. */
  voglerStages: string;
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

/** 3+4+5+6+4+6+5+4+3 = 40 отрезков. */
export const SESSION_INTERVALS: IntervalDefinition[] = [
  {
    act: "I setup",
    id: "world",
    phase: "descent",
    label: "Мир",
    meaning: "Экспозиция обычного мира и первый зов",
    voglerStages: "1. The Ordinary World",
    campbellStages: "-",
    segments: 3,
    rhythmStart: 32,
    rhythmEnd: 16,
    carrierMultiplier: 8,
    gainPeakSlotStart: 0,
    gainPeakSlotEnd: 1,
    narratorPauseSeconds: 64,
    narratorSpeed: 0.80,
  },
  {
    act: "I setup",
    id: "call",
    phase: "descent",
    label: "Призыв",
    meaning: "Призыв, отказ, появление проводника",
    voglerStages: "2. The Call to Adventure, 3. Refusal of the Call",
    campbellStages: "1. The Call to Adventure, 2. Refusal of the Call",
    segments: 4,
    rhythmStart: 16,
    rhythmEnd: 8,
    carrierMultiplier: 16,
    gainPeakSlotStart: 1,
    gainPeakSlotEnd: 2,
    narratorPauseSeconds: 32,
    narratorSpeed: 0.78,
  },
  {
    act: "I setup",
    id: "threshold",
    phase: "descent",
    label: "Порог",
    meaning: "Пересечение порога и растворение старой идентичности",
    voglerStages: "4. Meeting with the Mentor, 5. Crossing the First Threshold",
    campbellStages: "3. Supernatural Aid, 4. The Crossing of the First Threshold, 5. The Belly of the Whale",
    segments: 5,
    rhythmStart: 8,
    rhythmEnd: 4,
    carrierMultiplier: 32,
    gainPeakSlotStart: 2,
    gainPeakSlotEnd: 3,
    narratorPauseSeconds: 16,
    narratorSpeed: 0.76,
  },
  {
    act: "II confrontation",
    id: "trials",
    phase: "descent",
    label: "Испытания",
    meaning: "Испытания, союзники, враги, нарастание напряжения",
    voglerStages: "6. Tests, Allies, and Enemies, 7. Approach (to the Innermost Cave)",
    campbellStages: "6. The Road of Trials, 7. The Meeting with the Goddess, 8. Woman as the Temptress",
    segments: 6,
    rhythmStart: 4,
    rhythmEnd: 0.5,
    carrierMultiplier: 64,
    gainPeakSlotStart: 3,
    gainPeakSlotEnd: 3,
    narratorPauseSeconds: 8,
    narratorSpeed: 0.74,
  },
  {
    act: "II confrontation",
    id: "ordeal",
    phase: "plateau",
    label: "Ордалия",
    meaning: "Центральный кризис, апофеоз, перелом",
    voglerStages: "8. The Ordeal",
    campbellStages: "9. Atonement with the Father, 10. Apotheosis",
    segments: 4,
    rhythmStart: 0.5,
    rhythmEnd: 0.5,
    carrierMultiplier: 64,
    gainPeakSlotStart: 3,
    gainPeakSlotEnd: 3,
    narratorPauseSeconds: 4,
    narratorSpeed: 0.72,
  },
  {
    act: "II confrontation",
    id: "reward",
    phase: "ascent",
    label: "Дар",
    meaning: "Обретение дара и намерение вернуться",
    voglerStages: "9. Reward (Seizing the Sword)",
    campbellStages: "11. The Ultimate Boon",
    segments: 6,
    rhythmStart: 0.5,
    rhythmEnd: 4,
    carrierMultiplier: 64,
    gainPeakSlotStart: 3,
    gainPeakSlotEnd: 3,
    narratorPauseSeconds: 8,
    narratorSpeed: 0.74,
  },
  {
    act: "III resolution",
    id: "homing",
    phase: "ascent",
    label: "Возврат",
    meaning: "Обратный путь, убывание опасности",
    voglerStages: "10. The Road Back",
    campbellStages: "12. Refusal of the Return, 13. The Magic Flight, 14. Rescue from Without",
    segments: 5,
    rhythmStart: 4,
    rhythmEnd: 8,
    carrierMultiplier: 32,
    gainPeakSlotStart: 3,
    gainPeakSlotEnd: 2,
    narratorPauseSeconds: 16,
    narratorSpeed: 0.76,
  },
  {
    act: "III resolution",
    id: "resurrection",
    phase: "ascent",
    label: "Воскрешение",
    meaning: "Финальная угроза и последний выбор",
    voglerStages: "11. The Resurrection",
    campbellStages: "15. The Crossing of the Return Threshold",
    segments: 4,
    rhythmStart: 8,
    rhythmEnd: 16,
    carrierMultiplier: 16,
    gainPeakSlotStart: 2,
    gainPeakSlotEnd: 1,
    narratorPauseSeconds: 32,
    narratorSpeed: 0.78,
  },
  {
    act: "III resolution",
    id: "return",
    phase: "ascent",
    label: "Финал",
    meaning: "Интеграция и финальный образ",
    voglerStages: "12. Return with the Elixir",
    campbellStages: "16. Master of Two Worlds, 17. Freedom to Live",
    segments: 3,
    rhythmStart: 16,
    rhythmEnd: 32,
    carrierMultiplier: 8,
    gainPeakSlotStart: 1,
    gainPeakSlotEnd: 0,
    narratorPauseSeconds: 64,
    narratorSpeed: 0.80,
  },
];

export function totalSegments(intervals: IntervalDefinition[]): number {
  return intervals.reduce((sum, interval) => sum + interval.segments, 0);
}

export function actSegmentCounts(
  intervals: IntervalDefinition[],
): Record<SessionAct, number> {
  const counts: Record<SessionAct, number> = {
    "I setup": 0,
    "II confrontation": 0,
    "III resolution": 0,
  };
  for (const interval of intervals) {
    counts[interval.act] += interval.segments;
  }
  return counts;
}
