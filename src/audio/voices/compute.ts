import { carrierCenterHz } from "../../session/carrierPlan";
import {
  ASCENT_INTERVAL_START,
  getIntervalPosition,
  getRhythmAt,
  intervalEndElapsed,
  PLATEAU_INTERVAL_INDEX,
} from "../../session/config";
import { CHOIR_MEMBERS } from "./choirMembers";
import { memberCenterHz } from "./frequency";
import type { HarmonicSlot } from "./harmonic";
import { memberGainAt } from "./gains";
import type { ChannelSide, ChoirMemberSnapshot, VoiceSample, VoiceTickState } from "./types";

function channelFrequency(centerHz: number, rhythmHz: number, side: ChannelSide): number {
  const half = rhythmHz / 2;
  return side === "left" ? centerHz - half : centerHz + half;
}

/** y(elapsed): частота и gain одного голоса в канале. */
export function sampleVoiceAt(
  elapsed: number,
  slot: HarmonicSlot,
  side: ChannelSide,
): VoiceSample {
  const position = getIntervalPosition(elapsed);
  const { intervalIndex, progress, interval } = position;
  const rhythm = getRhythmAt(position);
  const peakCarrier = carrierCenterHz(intervalIndex, progress);
  const center = memberCenterHz(slot, peakCarrier, intervalIndex);
  const gain = memberGainAt(
    slot,
    intervalIndex,
    progress,
    interval.isDescent,
    interval.isAscent,
    PLATEAU_INTERVAL_INDEX,
    ASCENT_INTERVAL_START,
  );

  return {
    frequency: channelFrequency(center, rhythm, side),
    gain,
  };
}

/** y(elapsed): все голоса одного канала. */
export function sampleChannelAt(
  elapsed: number,
  side: ChannelSide,
): VoiceSample[] {
  return CHOIR_MEMBERS.map((member) => sampleVoiceAt(elapsed, member.slot, side));
}

function voiceStateAtPoint(sample: VoiceSample): VoiceTickState {
  return {
    frequency: sample.frequency,
    frequencyEnd: sample.frequency,
    gain: sample.gain,
    gainEnd: sample.gain,
  };
}

export function computeMemberSnapshot(memberIndex: number, elapsed: number): ChoirMemberSnapshot {
  const member = CHOIR_MEMBERS[memberIndex];
  const left = sampleVoiceAt(elapsed, member.slot, "left");
  const right = sampleVoiceAt(elapsed, member.slot, "right");

  return {
    memberIndex,
    slot: member.slot,
    left: voiceStateAtPoint(left),
    right: voiceStateAtPoint(right),
  };
}

export function computeChoirAt(elapsed: number): ChoirMemberSnapshot[] {
  return CHOIR_MEMBERS.map((member) => computeMemberSnapshot(member.index, elapsed));
}

/** Состояние на границе интервала (progress 0 или 1). */
export function computeChoirAtIntervalEdge(
  intervalIndex: number,
  edge: "start" | "end",
): ChoirMemberSnapshot[] {
  const elapsed =
    edge === "start"
      ? intervalIndex === 0
        ? 0
        : intervalEndElapsed(intervalIndex - 1)
      : intervalEndElapsed(intervalIndex) - 1e-12;
  return computeChoirAt(elapsed);
}

/** Алиас для планировщика: значения канала в одной точке elapsed. */
export function computeChannelOutputs(
  elapsed: number,
  side: ChannelSide,
): VoiceSample[] {
  return sampleChannelAt(elapsed, side);
}
