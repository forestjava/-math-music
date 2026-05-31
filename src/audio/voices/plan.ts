import { CHOIR_MEMBER_COUNT } from "./harmonic";
import { BOUNDARY_CHECKPOINTS, BOUNDARY_TRANSITIONS, formatBoundaryReport, verifyBoundaryContinuity } from "./boundaryStates";

export const CHOIR_SIZE = CHOIR_MEMBER_COUNT;

export function getPlanningSummary(): string {
  const report = verifyBoundaryContinuity();
  const lines = [
    "=== План хора: 9 участников × 2 канала = 18 осцилляторов ===",
    "",
    "Частоты: center × 2^slot; gain: алгоритмическая пирамида (спуск / плато / подъём).",
    "Тики: период 1/ритм (0.5–32 Гц), без requestAnimationFrame.",
    "",
    "Контрольные точки:",
    ...BOUNDARY_CHECKPOINTS.map((c) => {
      const mark = c.isEndpoint ? "" : ` ← ${c.elapsed.toFixed(2)}s`;
      return `  • ${c.label}${mark}`;
    }),
    "",
    "Проверяемые стыки:",
    ...BOUNDARY_TRANSITIONS.map((t) => `  • ${t.label}`),
    "",
    formatBoundaryReport(report),
  ];
  return lines.join("\n");
}

