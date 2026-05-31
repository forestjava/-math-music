import type { SessionTick } from "../../session/tickModel";
import { computeChoirAt } from "./compute";
import type { ChoirMemberSnapshot } from "./types";

export interface TickChoirSample {
  tick: SessionTick;
  members: ChoirMemberSnapshot[];
}

export function sampleChoirAtTick(tick: SessionTick): TickChoirSample {
  return {
    tick,
    members: computeChoirAt(tick.startElapsed),
  };
}
