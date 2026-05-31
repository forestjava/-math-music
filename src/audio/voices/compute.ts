import { carrierCenterHz } from "../../session/carrierPlan";
import {
  ASCENT_INTERVAL_START,
  getIntervalPosition,
  getRhythmAt,
  intervalEndElapsed,
  PLATEAU_INTERVAL_INDEX,
} from "../../session/config";
import { tickPeriodAtElapsed } from "../../session/tickModel";
import { CHOIR_MEMBERS } from "./choirMembers";
import { memberCenterHz } from "./frequency";
import type { HarmonicSlot } from "./harmonic";
import { memberGainAt } from "./gains";
import type { ChannelSide, ChoirMemberSnapshot, VoiceTickState } from "./types";

function channelFrequency(centerHz: number, rhythmHz: number, side: ChannelSide): number {
  const half = rhythmHz / 2;
  return side === "left" ? centerHz - half : centerHz + half;
}

function resolveGain(slot: HarmonicSlot, elapsed: number): number {
  const { intervalIndex, progress, interval } = getIntervalPosition(elapsed);
  return memberGainAt(
    slot,
    intervalIndex,
    progress,
    interval.isDescent,
    interval.isAscent,
    PLATEAU_INTERVAL_INDEX,
    ASCENT_INTERVAL_START,
  );
}

function memberFrequency(
  slot: HarmonicSlot,
  elapsed: number,
  side: ChannelSide,
): number {
  const position = getIntervalPosition(elapsed);
  const { intervalIndex, progress } = position;
  const rhythm = getRhythmAt(position);
  const peakCarrier = carrierCenterHz(intervalIndex, progress);
  const center = memberCenterHz(slot, peakCarrier, intervalIndex);
  return channelFrequency(center, rhythm, side);
}

export function computeVoiceTickState(
  slot: HarmonicSlot,
  elapsed: number,
  side: ChannelSide,
): VoiceTickState {
  const gain = resolveGain(slot, elapsed);
  const frequency = memberFrequency(slot, elapsed, side);

  const period = tickPeriodAtElapsed(elapsed);
  const endElapsed = elapsed + period;
  const endGain = resolveGain(slot, endElapsed);

  return {
    frequency,
    frequencyEnd: memberFrequency(slot, endElapsed, side),
    gain,
    gainEnd: endGain,
  };
}

export function computeMemberSnapshot(memberIndex: number, elapsed: number): ChoirMemberSnapshot {
  const member = CHOIR_MEMBERS[memberIndex];
  return {
    memberIndex,
    slot: member.slot,
    left: computeVoiceTickState(member.slot, elapsed, "left"),
    right: computeVoiceTickState(member.slot, elapsed, "right"),
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

export function computeChannelOutputs(
  elapsed: number,
  side: ChannelSide,
): { frequency: number; gain: number }[] {
  return computeChoirAt(elapsed).map((snapshot) => {
    const channel = side === "left" ? snapshot.left : snapshot.right;
    return { frequency: channel.frequency, gain: channel.gain };
  });
}
