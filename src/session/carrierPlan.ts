import { lerp } from "./timeline";

/**
 * Центр несущей на вершине gain-пирамиды (Гц) по ТЗ.
 * Каждый интервал задаёт свой диапазон независимо.
 */
const CARRIER_RANGE: readonly (readonly [number, number])[] = [
  [512, 256], // β↓
  [512, 256], // α↓
  [512, 256], // θ↓
  [512, 64], // δ↓
  [64, 64], // δ плато
  [64, 512], // δ↑
  [256, 512], // θ↑
  [256, 512], // α↑
  [256, 512], // β↑
];

/** Центральная несущая (Гц) на границе интервала. */
export function carrierBoundaryHz(intervalIndex: number, atStart: boolean): number {
  const range = CARRIER_RANGE[intervalIndex];
  return atStart ? range[0] : range[1];
}

/** Плавная центральная несущая внутри интервала (на вершине пирамиды). */
export function carrierCenterHz(intervalIndex: number, progress: number): number {
  const [startHz, endHz] = CARRIER_RANGE[intervalIndex];
  return lerp(startHz, endHz, progress);
}
