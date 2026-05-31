import type { HarmonicSlot } from "./harmonic";
import { HARMONIC_SLOT_MAX, HARMONIC_SLOT_MIN } from "./harmonic";
import {
  DELTA_ASCENT_INDEX,
  DELTA_DESCENT_INDEX,
  PLATEAU_INTERVAL_INDEX,
  THETA_ASCENT_INDEX,
} from "../../session/config";
import { frequencyPhaseIndex } from "./frequency";

/** Gain пирамиды на старте сессии (β↓), вершина на slot 0. */
export function pyramidGainAtSessionStart(slot: HarmonicSlot): number {
  if (slot < 0) return 2 ** slot;
  if (slot === 0) return 1;
  return 2 ** -slot;
}

/** Gain пирамиды с вершиной на `peakSlot`. */
export function pyramidGainAtPeak(slot: HarmonicSlot, peakSlot: HarmonicSlot): number {
  if (slot <= peakSlot) return 2 ** (slot - peakSlot);
  return 2 ** (peakSlot - slot);
}

function gainForShiftedSlot(shiftedSlot: number): number {
  if (shiftedSlot >= HARMONIC_SLOT_MIN && shiftedSlot <= HARMONIC_SLOT_MAX) {
    return pyramidGainAtSessionStart(shiftedSlot as HarmonicSlot);
  }
  if (shiftedSlot > HARMONIC_SLOT_MAX) {
    return 2 ** (HARMONIC_SLOT_MIN - (shiftedSlot - HARMONIC_SLOT_MAX));
  }
  return 2 ** shiftedSlot;
}

/** Состояние пирамиды после `shifts` интервалов спуска от старта сессии. */
export function gainAfterDescentShifts(slot: HarmonicSlot, shifts: number): number {
  return gainForShiftedSlot(slot + shifts);
}

const DESCENT_SHIFTS_AT_PLATEAU = 4;

/** Слот, исполняющий роль несущей (gain = 1) на всей дельта-фазе. */
export function deltaCarrierSlot(): HarmonicSlot {
  return frequencyPhaseIndex(DELTA_DESCENT_INDEX) as HarmonicSlot;
}

export function isDeltaPhase(intervalIndex: number): boolean {
  return intervalIndex >= DELTA_DESCENT_INDEX && intervalIndex <= DELTA_ASCENT_INDEX;
}

function deltaPhaseGain(slot: HarmonicSlot): number {
  return pyramidGainAtPeak(slot, deltaCarrierSlot());
}

export function memberGainAt(
  slot: HarmonicSlot,
  intervalIndex: number,
  progress: number,
  isDescent: boolean,
  isAscent: boolean,
  plateauIndex: number,
  ascentStart: number,
): number {
  void plateauIndex;
  void ascentStart;

  /** δ↓ … δ плато … δ↑: вершина gain на дельта-несущей (slot 3), без сдвига. */
  if (isDeltaPhase(intervalIndex)) {
    return deltaPhaseGain(slot);
  }

  if (isDescent) {
    /** θ↓: к концу интервола плавно переходит к дельта-пирамиде (стык с δ↓). */
    if (intervalIndex === DELTA_DESCENT_INDEX - 1) {
      const start = gainAfterDescentShifts(slot, intervalIndex);
      const end = deltaPhaseGain(slot);
      return start + (end - start) * progress;
    }

    const start = gainAfterDescentShifts(slot, intervalIndex);
    const end = gainAfterDescentShifts(slot, intervalIndex + 1);
    return start + (end - start) * progress;
  }

  if (intervalIndex === PLATEAU_INTERVAL_INDEX) {
    return gainAfterDescentShifts(slot, DESCENT_SHIFTS_AT_PLATEAU);
  }

  /** θ↑ … β↑: сдвиг вершины от дельта-несущей (3) к slot 0. */
  if (isAscent && intervalIndex >= THETA_ASCENT_INDEX) {
    const ascentIndex = intervalIndex - THETA_ASCENT_INDEX;
    const peakStart = (deltaCarrierSlot() - ascentIndex) as HarmonicSlot;
    const peakEnd = (deltaCarrierSlot() - ascentIndex - 1) as HarmonicSlot;
    const start = pyramidGainAtPeak(slot, peakStart);
    const end = pyramidGainAtPeak(slot, peakEnd);
    return start + (end - start) * progress;
  }

  return gainAfterDescentShifts(slot, DESCENT_SHIFTS_AT_PLATEAU);
}
