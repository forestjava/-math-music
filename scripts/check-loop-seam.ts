import { computeChoirAt, computeChoirAtIntervalEdge } from "../src/audio/voices/compute";
import { CHOIR_MEMBERS } from "../src/audio/voices/choirMembers";
import { HARMONIC_LABELS } from "../src/audio/voices/harmonic";
import { voiceSampleEqual } from "./lib/choirMatch";
import { setupDefaultRuntime } from "./lib/setupRuntime";

const runtime = setupDefaultRuntime();

const start = computeChoirAt(0);
const finish = computeChoirAtIntervalEdge(8, "end");
const wrap = computeChoirAt(runtime.durationSeconds);

let ok = true;
for (const m of CHOIR_MEMBERS) {
  const channels = ["left", "right", "center"] as const;
  for (const ch of channels) {
    const s = start[m.index][ch];
    const f = finish[m.index][ch];
    const w = wrap[m.index][ch];
    if (!voiceSampleEqual(s, f) || !voiceSampleEqual(s, w)) {
      ok = false;
      console.log(
        `FAIL ${HARMONIC_LABELS[m.slot]} ${ch}: start ${s.frequency}/${s.gain} finish ${f.frequency}/${f.gain} wrap ${w.frequency}/${w.gain}`,
      );
    }
  }
}

console.log(ok ? "Loop seam (финиш β↑ → старт β↓): OK" : "Loop seam: FAIL");
process.exit(ok ? 0 : 1);
