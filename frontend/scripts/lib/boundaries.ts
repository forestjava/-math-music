import { getActiveSessionRuntime } from "../../src/session/activeRuntime";
import { computeChoirAtIntervalEdge } from "../../src/audio/voices/compute";
import type { ChoirMemberSnapshot } from "../../src/audio/voices/types";
import { voiceSampleEqual } from "./choirMatch";

export interface BoundaryCheckpoint {
  id: string;
  label: string;
  elapsed: number;
  isEndpoint?: boolean;
}

export interface BoundaryTransition {
  id: string;
  label: string;
  fromIntervalIndex: number;
  toIntervalIndex: number;
}

export interface BoundaryContinuityReport {
  ok: boolean;
  failures: { boundary: string; memberIndex: number; before: string; after: string }[];
}

const BOUNDARY_INTERVAL_PAIRS: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 8],
];

/** Стыки, на которых end предыдущего интервала должен совпадать со start следующего. */
export function getBoundaryTransitions(): BoundaryTransition[] {
  const intervals = getActiveSessionRuntime().intervals;

  return BOUNDARY_INTERVAL_PAIRS.map(([fromIntervalIndex, toIntervalIndex]) => {
    const from = intervals[fromIntervalIndex];
    const to = intervals[toIntervalIndex];
    return {
      id: `${from.id}-to-${to.id}`,
      label: `после «${from.label}» = начало «${to.label}»`,
      fromIntervalIndex,
      toIntervalIndex,
    };
  });
}

export function getBoundaryCheckpoints(): BoundaryCheckpoint[] {
  const runtime = getActiveSessionRuntime();
  const intervals = runtime.intervals;
  const startLabel = intervals[0].label;
  const finishLabel = intervals[intervals.length - 1].label;

  return [
    { id: "session-start", label: `старт = начало «${startLabel}» *`, elapsed: 0, isEndpoint: true },
    ...intervals.slice(1).map((interval, index) => ({
      id: `${interval.id}-start`,
      label: `начало «${interval.label}»`,
      elapsed: runtime.intervalEndElapsed(index),
    })),
    {
      id: "session-finish",
      label: `финиш = окончание «${finishLabel}» *`,
      elapsed: runtime.intervalEndElapsed(intervals.length - 1),
      isEndpoint: true,
    },
  ];
}

function channelEqual(
  a: ChoirMemberSnapshot["left"],
  b: ChoirMemberSnapshot["left"],
): boolean {
  return voiceSampleEqual(a, b);
}

export function verifyBoundaryContinuity(): BoundaryContinuityReport {
  const failures: BoundaryContinuityReport["failures"] = [];

  for (const transition of getBoundaryTransitions()) {
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

export function transitionFailed(
  report: BoundaryContinuityReport,
  transition: BoundaryTransition,
): boolean {
  return report.failures.some((f) => f.boundary === transition.label);
}

export function formatBoundaryReport(report: BoundaryContinuityReport): string {
  const transitions = getBoundaryTransitions();
  if (report.ok) {
    return `Стыки интервалов (${transitions.length}): все параметры хора непрерывны.`;
  }

  return [
    "Стыки интервалов: обнаружены разрывы:",
    ...report.failures.map(
      (f) => `  ${f.boundary} · member ${f.memberIndex}: ${f.before} ≠ ${f.after}`,
    ),
  ].join("\n");
}
