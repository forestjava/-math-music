import { lerp } from "./timeline";

/**
 * Центр несущей на вершине gain-пирамиды (Гц) по ТЗ.
 * Каждый интервал задаёт свой диапазон независимо.
 */
const CARRIER_RANGE: readonly (readonly [number, number])[] = [
  [256, 128], // β↓
  [256, 128], // α↓
  [256, 128], // θ↓
  [256, 32], // δ↓
  [32, 32], // δ плато
  [32, 256], // δ↑
  [128, 256], // θ↑
  [128, 256], // α↑
  [128, 256], // β↑
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
