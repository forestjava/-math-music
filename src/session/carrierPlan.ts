import type { IntervalDefinition } from "./intervals";
import { lerp } from "./math";

/** Центральная несущая (Гц) на границе интервала. */
export function carrierBoundaryHz(interval: IntervalDefinition, atStart: boolean): number {
  const carrierStartHz = interval.rhythmStart * interval.carrierMultiplier;
  const carrierEndHz = interval.rhythmEnd * interval.carrierMultiplier;
  return atStart ? carrierStartHz : carrierEndHz;
}

/** Плавная центральная несущая внутри интервала (на вершине пирамиды). */
export function carrierCenterHz(interval: IntervalDefinition, progress: number): number {
  const carrierStartHz = interval.rhythmStart * interval.carrierMultiplier;
  const carrierEndHz = interval.rhythmEnd * interval.carrierMultiplier;
  return lerp(carrierStartHz, carrierEndHz, progress);
}
