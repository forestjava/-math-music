import type { IntervalDefinition } from "../../session/intervals";
import type { HarmonicSlot } from "./harmonic";

/** Слот вершины частотной пирамиды — из пары gainPeakSlotStart/End (без отдельной константы). */
export function frequencyPeakSlot(interval: IntervalDefinition): number {
  if (interval.gainPeakSlotStart === interval.gainPeakSlotEnd) {
    return interval.gainPeakSlotStart;
  }
  const isDescent = interval.rhythmEnd < interval.rhythmStart;
  return isDescent ? interval.gainPeakSlotStart : interval.gainPeakSlotEnd;
}

/**
 * Центральная частота = несущая вершины × 2^(slot − peakSlot).
 * Gain-пик движется start→end; частотный якорь — start на спуске, end на подъёме
 * (роль вершины переходит к другому осциллятору, прежний пик смещается и затухает).
 */
export function memberCenterHz(
  slot: HarmonicSlot,
  peakCarrierHz: number,
  interval: IntervalDefinition,
): number {
  return peakCarrierHz * 2 ** (slot - frequencyPeakSlot(interval));
}