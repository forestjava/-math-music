export type { HarmonicSlot } from "./harmonic";
export { HARMONIC_SLOTS, HARMONIC_LABELS, CHOIR_MEMBER_COUNT } from "./harmonic";
export type { ChoirMember } from "./choirMembers";
export { CHOIR_MEMBERS } from "./choirMembers";

export type ChannelSide = "left" | "right";

export interface VoiceTickState {
  frequency: number;
  frequencyEnd: number;
  gain: number;
  gainEnd: number;
}

export interface ChoirMemberSnapshot {
  memberIndex: number;
  slot: import("./harmonic").HarmonicSlot;
  left: VoiceTickState;
  right: VoiceTickState;
}
