import {
  carrierBoundary,
  carrierCenterAt,
  getIntervalPosition,
  getRhythmAt,
  intervalEndElapsed,
  lerp,
  PLATEAU_INDEX,
} from "../../session/timeline";
import { VOICE_PLAN } from "./plan";
import type {
  ChannelSide,
  CrossfadeKind,
  VoiceOutput,
  VoicePlan,
  VoiceRoute,
  VoiceSegment,
} from "./types";

export const MIN_FREQUENCY = 20;
const FADE_TAIL_SECONDS = 4;
const SUBHARMONIC_PRERAMP_FROM = 0.55;

function centerFreq(intervalIndex: number, slot: number, atStart: boolean): number {
  return carrierBoundary(intervalIndex, atStart) * 2 ** slot;
}

function channelFreq(centerHz: number, rhythm: number, side: ChannelSide): number {
  const half = rhythm / 2;
  return Math.max(MIN_FREQUENCY, side === "left" ? centerHz - half : centerHz + half);
}

function applyCrossfade(
  kind: CrossfadeKind,
  slot: number,
  progress: number,
  linearGain: number,
): number {
  if (kind === "descent-handoff") {
    if (slot === 0) return crossfadeCarrierToSub(progress);
    if (slot === 1) return crossfadeHarmonicToCarrier(progress);
    return linearGain;
  }

  if (slot === -1) return crossfadeCarrierToAscentSub(progress);
  return linearGain;
}

function crossfadeCarrierToSub(progress: number): number {
  const carrier = lerp(1, 0, progress);
  const sub =
    progress >= SUBHARMONIC_PRERAMP_FROM
      ? lerp(0, 0.5, (progress - SUBHARMONIC_PRERAMP_FROM) / (1 - SUBHARMONIC_PRERAMP_FROM))
      : 0;
  return carrier + sub;
}

function crossfadeHarmonicToCarrier(progress: number): number {
  const harmonic = lerp(0.5, 0, progress);
  const carrier =
    progress >= SUBHARMONIC_PRERAMP_FROM
      ? lerp(0, 1, (progress - SUBHARMONIC_PRERAMP_FROM) / (1 - SUBHARMONIC_PRERAMP_FROM))
      : 0;
  return harmonic + carrier;
}

function crossfadeCarrierToAscentSub(progress: number): number {
  const carrier = lerp(0.5, 0, progress);
  const sub =
    progress >= SUBHARMONIC_PRERAMP_FROM
      ? lerp(0, 1, (progress - SUBHARMONIC_PRERAMP_FROM) / (1 - SUBHARMONIC_PRERAMP_FROM))
      : 0;
  return carrier + sub;
}

function segmentGain(segment: VoiceSegment, progress: number): number {
  const linear = lerp(segment.gainStart, segment.gainEnd, progress);
  if (!segment.crossfade) return linear;
  return applyCrossfade(segment.crossfade, segment.slot, progress, linear);
}

function plateauCenterFromThetaEnd(endCenterHz: number, rhythm: number): number {
  const plateauStartCarrier = carrierBoundary(PLATEAU_INDEX, true);
  const currentCarrier = rhythm * 128;
  return endCenterHz * (currentCarrier / plateauStartCarrier);
}

function fadeGain(elapsed: number, fadeStart: number, endGain: number): number {
  if (elapsed <= fadeStart) return endGain;
  return endGain * Math.max(0, 1 - (elapsed - fadeStart) / FADE_TAIL_SECONDS);
}

function segmentAt(plan: VoicePlan, intervalIndex: number): VoiceSegment | undefined {
  return plan.segments.find((segment) => segment.intervalIndex === intervalIndex);
}

function resolveVoiceOutput(
  plan: VoicePlan,
  elapsed: number,
  side: ChannelSide,
): { output: VoiceOutput; route: VoiceRoute } {
  const inactive: VoiceOutput = { frequency: MIN_FREQUENCY, gain: 0 };
  const position = getIntervalPosition(elapsed);
  const { intervalIndex, progress } = position;
  const rhythm = getRhythmAt(position);
  const segment = segmentAt(plan, intervalIndex);
  if (segment) {
    if (segment.intervalIndex === PLATEAU_INDEX) {
      const thetaSeg = plan.segments.find((entry) => entry.intervalIndex === PLATEAU_INDEX - 1);
      if (!thetaSeg) return { route: "inactive", output: inactive };
      const endCenter = lerp(
        centerFreq(PLATEAU_INDEX - 1, thetaSeg.slot, true),
        centerFreq(PLATEAU_INDEX - 1, thetaSeg.slot, false),
        1,
      );
      const center = plateauCenterFromThetaEnd(endCenter, rhythm);
      return {
        route: "plateau",
        output: {
          frequency: channelFreq(center, rhythm, side),
          gain: segmentGain(segment, progress),
        },
      };
    }

    const center = lerp(
      centerFreq(segment.intervalIndex, segment.slot, true),
      centerFreq(segment.intervalIndex, segment.slot, false),
      progress,
    );
    return {
      route: "segment",
      output: {
        frequency: channelFreq(center, rhythm, side),
        gain: segmentGain(segment, progress),
      },
    };
  }

  if (plan.tailFadeAfterInterval !== undefined && intervalIndex > plan.tailFadeAfterInterval) {
    const fadeSeg = segmentAt(plan, plan.tailFadeAfterInterval);
    const tailGain = plan.tailGain ?? fadeSeg?.gainEnd ?? 0;
    const fadeStart = intervalEndElapsed(plan.tailFadeAfterInterval);
    const endCenter = fadeSeg
      ? lerp(
          centerFreq(fadeSeg.intervalIndex, fadeSeg.slot, true),
          centerFreq(fadeSeg.intervalIndex, fadeSeg.slot, false),
          1,
        )
      : carrierCenterAt(plan.tailFadeAfterInterval, 1);
    return {
      route: "tail",
      output: {
        frequency: channelFreq(endCenter, rhythm, side),
        gain: fadeGain(elapsed, fadeStart, tailGain),
      },
    };
  }

  return { route: "inactive", output: inactive };
}

export function computeVoiceOutput(
  plan: VoicePlan,
  elapsed: number,
  side: ChannelSide,
): VoiceOutput {
  return resolveVoiceOutput(plan, elapsed, side).output;
}

export function computeAllVoiceOutputs(elapsed: number, side: ChannelSide): VoiceOutput[] {
  return VOICE_PLAN.map((plan) => computeVoiceOutput(plan, elapsed, side));
}

export { VOICE_PLAN };