import { intervalEndElapsed } from "../../session/config";
import { computeChoirAtIntervalEdge } from "./compute";
import type { ChoirMemberSnapshot } from "./types";

export interface BoundaryCheckpoint {
  id: string;
  /** Человекочитаемая метка из ТЗ */
  label: string;
  elapsed: number;
  /** Старт/финиш — одна точка, стыковать не с чем */
  isEndpoint?: boolean;
}

/**
 * Контрольные точки сессии.
 * * — старт (= начало β↓) и финиш (= окончание β↑) не участвуют в проверке стыков.
 */
export const BOUNDARY_CHECKPOINTS: BoundaryCheckpoint[] = [
  { id: "session-start", label: "старт = начало β↓ *", elapsed: 0, isEndpoint: true },
  { id: "alpha-descent-start", label: "начало α↓", elapsed: intervalEndElapsed(0) },
  { id: "theta-descent-start", label: "начало θ↓", elapsed: intervalEndElapsed(1) },
  { id: "delta-descent-start", label: "начало δ↓", elapsed: intervalEndElapsed(2) },
  { id: "delta-plateau-start", label: "начало δ плато", elapsed: intervalEndElapsed(3) },
  { id: "delta-ascent-start", label: "начало δ↑", elapsed: intervalEndElapsed(4) },
  { id: "theta-ascent-start", label: "начало θ↑", elapsed: intervalEndElapsed(5) },
  { id: "alpha-ascent-start", label: "начало α↑", elapsed: intervalEndElapsed(6) },
  { id: "beta-ascent-start", label: "начало β↑", elapsed: intervalEndElapsed(7) },
  { id: "session-finish", label: "финиш = окончание β↑ *", elapsed: intervalEndElapsed(8), isEndpoint: true },
];

export interface BoundaryTransition {
  id: string;
  label: string;
  fromIntervalIndex: number;
  toIntervalIndex: number;
}

/** Стыки, на которых end предыдущего интервала должен совпадать со start следующего. */
export const BOUNDARY_TRANSITIONS: BoundaryTransition[] = [
  {
    id: "beta-to-alpha",
    label: "после β↓ = начало α↓",
    fromIntervalIndex: 0,
    toIntervalIndex: 1,
  },
  {
    id: "alpha-to-theta",
    label: "после α↓ = начало θ↓",
    fromIntervalIndex: 1,
    toIntervalIndex: 2,
  },
  {
    id: "theta-to-delta-descent",
    label: "после θ↓ = начало δ↓",
    fromIntervalIndex: 2,
    toIntervalIndex: 3,
  },
  {
    id: "delta-descent-to-plateau",
    label: "после δ↓ = начало δ плато",
    fromIntervalIndex: 3,
    toIntervalIndex: 4,
  },
  {
    id: "plateau-to-delta-ascent",
    label: "после δ плато = начало δ↑",
    fromIntervalIndex: 4,
    toIntervalIndex: 5,
  },
  {
    id: "delta-ascent-to-theta-ascent",
    label: "после δ↑ = начало θ↑",
    fromIntervalIndex: 5,
    toIntervalIndex: 6,
  },
  {
    id: "theta-ascent-to-alpha-ascent",
    label: "после θ↑ = начало α↑",
    fromIntervalIndex: 6,
    toIntervalIndex: 7,
  },
  {
    id: "alpha-ascent-to-beta-ascent",
    label: "после α↑ = начало β↑",
    fromIntervalIndex: 7,
    toIntervalIndex: 8,
  },
];

function nearlyEqual(a: number, b: number): boolean {
  if (a === b) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) <= 1e-5 * scale;
}

function channelEqual(
  a: ChoirMemberSnapshot["left"],
  b: ChoirMemberSnapshot["left"],
): boolean {
  return nearlyEqual(a.frequency, b.frequency) && nearlyEqual(a.gain, b.gain);
}

export interface BoundaryContinuityReport {
  ok: boolean;
  failures: { boundary: string; memberIndex: number; before: string; after: string }[];
}

export function verifyBoundaryContinuity(): BoundaryContinuityReport {
  const failures: BoundaryContinuityReport["failures"] = [];

  for (const transition of BOUNDARY_TRANSITIONS) {
    const before = computeChoirAtIntervalEdge(transition.fromIntervalIndex, "end");
    const after = computeChoirAtIntervalEdge(transition.toIntervalIndex, "start");

    for (let m = 0; m < before.length; m++) {
      if (
        channelEqual(before[m].left, after[m].left) &&
        channelEqual(before[m].right, after[m].right) &&
        channelEqual(before[m].center, after[m].center)
      ) {
        continue;
      }
      const L = before[m].left;
      const LA = after[m].left;
      failures.push({
        boundary: transition.label,
        memberIndex: m,
        before: `${L.frequency}/${L.gain}`,
        after: `${LA.frequency}/${LA.gain}`,
      });
    }
  }

  return { ok: failures.length === 0, failures };
}

export function formatBoundaryReport(report: BoundaryContinuityReport): string {
  if (report.ok) {
    return `Стыки интервалов (${BOUNDARY_TRANSITIONS.length}): все параметры хора непрерывны.`;
  }

  return [
    "Стыки интервалов: обнаружены разрывы:",
    ...report.failures.map(
      (f) => `  ${f.boundary} · member ${f.memberIndex}: ${f.before} ≠ ${f.after}`,
    ),
  ].join("\n");
}
