import { getPlanningSummary } from "../src/audio/voices/plan";
import {
  BOUNDARY_CHECKPOINTS,
  BOUNDARY_TRANSITIONS,
  verifyBoundaryContinuity,
} from "../src/audio/voices/boundaryStates";
import { computeChoirAtIntervalEdge } from "../src/audio/voices/compute";
import { CHOIR_MEMBERS } from "../src/audio/voices/choirMembers";
import { HARMONIC_LABELS } from "../src/audio/voices/harmonic";

console.log("=== Контрольные точки ===\n");
for (const c of BOUNDARY_CHECKPOINTS) {
  const suffix = c.isEndpoint ? " (endpoint, не проверяется)" : "";
  console.log(`  ${c.label} @ ${c.elapsed.toFixed(3)}s${suffix}`);
}

console.log("\n=== Результат проверки стыков ===\n");
const report = verifyBoundaryContinuity();

for (const t of BOUNDARY_TRANSITIONS) {
  const before = computeChoirAtIntervalEdge(t.fromIntervalIndex, "end");
  const after = computeChoirAtIntervalEdge(t.toIntervalIndex, "start");
  const ok = before.every(
    (snap, m) =>
      Math.abs(snap.left.frequency - after[m].left.frequency) < 1e-4 &&
      Math.abs(snap.left.gain - after[m].left.gain) < 1e-8 &&
      Math.abs(snap.right.frequency - after[m].right.frequency) < 1e-4 &&
      Math.abs(snap.right.gain - after[m].right.gain) < 1e-8 &&
      Math.abs(snap.center.frequency - after[m].center.frequency) < 1e-4 &&
      Math.abs(snap.center.gain - after[m].center.gain) < 1e-8,
  );
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
const start = computeChoirAtIntervalEdge(0, "start");
for (const m of CHOIR_MEMBERS) {
  const s = start[m.index].left;
  console.log(
    `  ${HARMONIC_LABELS[m.slot].padEnd(8)} ${s.frequency.toFixed(2).padStart(8)} Hz  gain ${s.gain.toFixed(6)}`,
  );
}

console.log("\n" + getPlanningSummary());
