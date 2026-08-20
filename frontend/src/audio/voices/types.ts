import type { HarmonicSlot } from "./harmonic";

export type ChannelSide = "left" | "right";

export interface VoiceSample {
  frequency: number;
  gain: number;
}

export interface VoiceTickState {
  frequency: number;
  frequencyEnd: number;
  gain: number;
  gainEnd: number;
}

export interface ChoirMemberSnapshot {
  memberIndex: number;
  slot: HarmonicSlot;
  left: VoiceTickState;
  right: VoiceTickState;
  center: VoiceTickState;
}
