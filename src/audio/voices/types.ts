/**
 * Семь ролей осциллятора относительно несущей интервала:
 * x1/8, x1/4, x1/2, x1, x2, x4, x8
 */

export type HarmonicSlot = -3 | -2 | -1 | 0 | 1 | 2 | 3;

export const HARMONIC_SLOTS: HarmonicSlot[] = [-3, -2, -1, 0, 1, 2, 3];

export const HARMONIC_LABELS: Record<HarmonicSlot, string> = {
  [-3]: "x1/8",
  [-2]: "x1/4",
  [-1]: "x1/2",
  [0]: "carrier",
  [1]: "x2",
  [2]: "x4",
  [3]: "x8",
};

export type ChannelSide = "left" | "right";

export type VoicePhase =
  | "descent-fade"
  | "descent-cascade"
  | "plateau"
  | "ascent-cascade"
  | "ascent-fade"
  | "tail-fade";

export type CrossfadeKind = "descent-handoff" | "ascent-handoff";

export interface VoiceSegment {
  intervalIndex: number;
  slot: HarmonicSlot;
  gainStart: number;
  gainEnd: number;
  crossfade?: CrossfadeKind;
}

export interface VoicePlan {
  id: string;

  /** Человекочитаемое описание жизненного цикла (дедуплицированный план) */
  lifecycle: string;
  segments: VoiceSegment[];

  /** После какого интервала включается хвостовое затухание (если голос уже не активен) */
  tailFadeAfterInterval?: number;

  /** Gain на момент начала хвостового затухания */
  tailGain?: number;
}

export interface VoiceOutput {
  frequency: number;
  gain: number;
}

export type VoiceRoute = "segment" | "plateau" | "tail" | "inactive";
