import type { IntervalDefinition } from "../../session/intervals";
import type { HarmonicSlot } from "./harmonic";

function pyramidGainAtPeak(slot: HarmonicSlot, peakSlot: HarmonicSlot): number {
  if (slot <= peakSlot) return 2 ** (slot - peakSlot);
  return 2 ** (peakSlot - slot);
}

export function memberGainAt(
  slot: HarmonicSlot,
  interval: IntervalDefinition,
  progress: number,
): number {
  const start = pyramidGainAtPeak(slot, interval.gainPeakSlotStart as HarmonicSlot);
  const end = pyramidGainAtPeak(slot, interval.gainPeakSlotEnd as HarmonicSlot);
  return start + (end - start) * progress;
}
