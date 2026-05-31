import type { IntervalKind } from "./config";

export interface IntervalDefinition {
  kind: IntervalKind;
  segments: number;
  rhythmStart: number;
  rhythmEnd: number;
  carrierMultiplier: number;
  isDescent: boolean;
  isAscent: boolean;
}

/** 2+4+6+8+2+4+3+2+1 = 32 отрезка. */
export const INTERVALS: IntervalDefinition[] = [
  {
    kind: "betaDescent",
    segments: 2,
    rhythmStart: 32,
    rhythmEnd: 16,
    carrierMultiplier: 16,
    isDescent: true,
    isAscent: false,
  },
  {
    kind: "alphaDescent",
    segments: 4,
    rhythmStart: 16,
    rhythmEnd: 8,
    carrierMultiplier: 32,
    isDescent: true,
    isAscent: false,
  },
  {
    kind: "thetaDescent",
    segments: 6,
    rhythmStart: 8,
    rhythmEnd: 4,
    carrierMultiplier: 64,
    isDescent: true,
    isAscent: false,
  },
  {
    kind: "deltaDescent",
    segments: 8,
    rhythmStart: 4,
    rhythmEnd: 0.5,
    carrierMultiplier: 128,
    isDescent: true,
    isAscent: false,
  },
  {
    kind: "deltaPlateau",
    segments: 2,
    rhythmStart: 0.5,
    rhythmEnd: 0.5,
    carrierMultiplier: 128,
    isDescent: false,
    isAscent: false,
  },
  {
    kind: "deltaAscent",
    segments: 4,
    rhythmStart: 0.5,
    rhythmEnd: 4,
    carrierMultiplier: 128,
    isDescent: false,
    isAscent: true,
  },
  {
    kind: "thetaAscent",
    segments: 3,
    rhythmStart: 4,
    rhythmEnd: 8,
    carrierMultiplier: 64,
    isDescent: false,
    isAscent: true,
  },
  {
    kind: "alphaAscent",
    segments: 2,
    rhythmStart: 8,
    rhythmEnd: 16,
    carrierMultiplier: 32,
    isDescent: false,
    isAscent: true,
  },
  {
    kind: "betaAscent",
    segments: 1,
    rhythmStart: 16,
    rhythmEnd: 32,
    carrierMultiplier: 16,
    isDescent: false,
    isAscent: true,
  },
];

export const INTERVAL_COUNT = INTERVALS.length;

export const DESCENT_INTERVAL_COUNT = 4;
export const DELTA_DESCENT_INDEX = 3;
export const PLATEAU_INTERVAL_INDEX = 4;
export const DELTA_ASCENT_INDEX = 5;
export const ASCENT_INTERVAL_START = 5;
export const THETA_ASCENT_INDEX = 6;
