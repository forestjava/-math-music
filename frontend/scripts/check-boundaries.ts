import { computeChoirAtIntervalEdge } from "../src/audio/voices/compute";
import { CHOIR_MEMBERS } from "../src/audio/voices/choirMembers";
import { CHOIR_MEMBER_COUNT, HARMONIC_LABELS } from "../src/audio/voices/harmonic";
import {
  BOUNDARY_TRANSITIONS,
  formatBoundaryReport,
  getBoundaryCheckpoints,
  transitionFailed,
  verifyBoundaryContinuity,
} from "./lib/boundaries";
import { setupDefaultRuntime } from "./lib/setupRuntime";

setupDefaultRuntime();

console.log("=== Контрольные точки ===\n");
for (const c of getBoundaryCheckpoints()) {
  const suffix = c.isEndpoint ? " (endpoint, не проверяется)" : "";
  console.log(`  ${c.label} @ ${c.elapsed.toFixed(3)}s${suffix}`);
}

console.log("\n=== Результат проверки стыков ===\n");
const report = verifyBoundaryContinuity();

for (const t of BOUNDARY_TRANSITIONS) {
  const ok = !transitionFailed(report, t);
  console.log(`  ${ok ? "OK" : "FAIL"}  ${t.label}`);
}

console.log(`\nИтог: ${report.ok ? "все 8 стыков непрерывны" : `${report.failures.length} разрыв(ов)`}`);

if (!report.ok) {
  console.log("\nРазрывы:");
  for (const f of report.failures) {
    console.log(`  ${f.boundary} · ${HARMONIC_LABELS[CHOIR_MEMBERS[f.memberIndex].slot]}: ${f.before} ≠ ${f.after}`);
  }
}

console.log("\n=== Carrier на каждом стыке (center freq / gain) ===\n");
const carrierIndex = CHOIR_MEMBERS.find((m) => m.slot === 0)!.index;

for (const t of BOUNDARY_TRANSITIONS) {
  const end = computeChoirAtIntervalEdge(t.fromIntervalIndex, "end")[carrierIndex].center;
  const start = computeChoirAtIntervalEdge(t.toIntervalIndex, "start")[carrierIndex].center;
  console.log(
    `  ${t.label}\n    end:   ${end.frequency.toFixed(2)} Hz  gain ${end.gain.toFixed(6)}\n    start: ${start.frequency.toFixed(2)} Hz  gain ${start.gain.toFixed(6)}`,
  );
}

console.log("\n=== Пирамида gain на старте сессии ===\n");
const sessionStart = computeChoirAtIntervalEdge(0, "start");
for (const m of CHOIR_MEMBERS) {
  const s = sessionStart[m.index].left;
  console.log(
    `  ${HARMONIC_LABELS[m.slot].padEnd(8)} ${s.frequency.toFixed(2).padStart(8)} Hz  gain ${s.gain.toFixed(6)}`,
  );
}

console.log("\n=== План хора ===\n");
console.log(
  [
    `${CHOIR_MEMBER_COUNT} участников × 2 канала = ${CHOIR_MEMBER_COUNT * 2} осцилляторов`,
    "Частоты: center × 2^slot; gain: алгоритмическая пирамида (спуск / плато / подъём).",
    "Тики: период 1/ритм (0.5–32 Гц), без requestAnimationFrame.",
    "",
    "Контрольные точки:",
    ...getBoundaryCheckpoints().map((c) => {
      const mark = c.isEndpoint ? "" : ` ← ${c.elapsed.toFixed(2)}s`;
      return `  • ${c.label}${mark}`;
    }),
    "",
    "Проверяемые стыки:",
    ...BOUNDARY_TRANSITIONS.map((t) => `  • ${t.label}`),
    "",
    formatBoundaryReport(report),
  ].join("\n"),
);

process.exit(report.ok ? 0 : 1);
