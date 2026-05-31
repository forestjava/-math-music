import type { HarmonicSlot } from "./harmonic";
import { ASCENT_INTERVAL_START, PLATEAU_INTERVAL_INDEX } from "../../session/config";

/**
 * Фазовый индекс для частотной пирамиды.
 * Спуски 0..3 → 0..3; плато → 3; подъёмы → 3,2,1,0.
 * Не меняется скачком на стыках, поэтому частоты непрерывны
 * при скачке несущей вершины 128→256 между интервалами спуска.
 */
export function frequencyPhaseIndex(intervalIndex: number): number {
  if (intervalIndex <= 3) return intervalIndex;
  if (intervalIndex === PLATEAU_INTERVAL_INDEX) return 3;
  return 3 - (intervalIndex - ASCENT_INTERVAL_START);
}

/** Центральная частота участника = несущая вершины × 2^(slot − phaseIndex). */
export function memberCenterHz(
  slot: HarmonicSlot,
  peakCarrierHz: number,
  intervalIndex: number,
): number {
  return peakCarrierHz * 2 ** (slot - frequencyPhaseIndex(intervalIndex));
}
