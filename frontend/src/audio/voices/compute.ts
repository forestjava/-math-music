import { getActiveSessionRuntime } from "../../session/activeRuntime";
import { carrierCenterHz } from "../../session/carrierPlan";
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
  const runtime = getActiveSessionRuntime();
  const position = runtime.getIntervalPosition(elapsed);
  const { progress, interval } = position;
  const rhythm = runtime.getRhythmAt(position);
  const peakCarrier = carrierCenterHz(interval, progress);
  const center = memberCenterHz(slot, peakCarrier, interval);
  const gain = memberGainAt(slot, interval, progress);

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

/** y(elapsed): частота и gain одного голоса центральной пирамиды (без ±ритм/2). */
export function sampleCenterVoiceAt(elapsed: number, slot: HarmonicSlot): VoiceSample {
  const runtime = getActiveSessionRuntime();
  const position = runtime.getIntervalPosition(elapsed);
  const { progress, interval } = position;
  const peakCarrier = carrierCenterHz(interval, progress);
  const center = memberCenterHz(slot, peakCarrier, interval);
  const gain = memberGainAt(slot, interval, progress);

  return {
    frequency: center,
    gain,
  };
}

/** y(elapsed): все голоса центральной пирамиды. */
export function sampleCenterChannelAt(elapsed: number): VoiceSample[] {
  return CHOIR_MEMBERS.map((member) => sampleCenterVoiceAt(elapsed, member.slot));
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
  const center = sampleCenterVoiceAt(elapsed, member.slot);

  return {
    memberIndex,
    slot: member.slot,
    left: voiceStateAtPoint(left),
    right: voiceStateAtPoint(right),
    center: voiceStateAtPoint(center),
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
  const runtime = getActiveSessionRuntime();
  const elapsed =
    edge === "start"
      ? intervalIndex === 0
        ? 0
        : runtime.intervalEndElapsed(intervalIndex - 1)
      : runtime.intervalEndElapsed(intervalIndex) - 1e-12;
  return computeChoirAt(elapsed);
}

/** Алиас для планировщика: значения канала в одной точке elapsed. */
export function computeChannelOutputs(
  elapsed: number,
  side: ChannelSide,
): VoiceSample[] {
  return sampleChannelAt(elapsed, side);
}

/** Алиас для планировщика: значения центральной пирамиды в одной точке elapsed. */
export function computeCenterOutputs(elapsed: number): VoiceSample[] {
  return sampleCenterChannelAt(elapsed);
}
