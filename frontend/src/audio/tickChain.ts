import { alignToTickStart, nextTickAfter } from "../session/tickModel";
import { computeMasterOutput, sampleCenterChannelAt, sampleChannelAt } from "./voices/compute";
import { CHOIR_MEMBER_COUNT } from "./voices/harmonic";
import type { ChannelSide } from "./voices/types";

const DRIVER_MIN_DELAY_MS = 1;

export interface ScheduledChannel {
  oscillators: OscillatorNode[];
  voiceGains: GainNode[];
}

export interface TickChainTarget {
  context: AudioContext;
  master: GainNode;
  left: ScheduledChannel;
  right: ScheduledChannel;
  center: ScheduledChannel;
  sessionStartAudio: number;
  durationSeconds: number;
  getPlaybackState: () => "stopped" | "playing" | "paused";
  onSessionComplete?: () => void;
}

export class TickChainScheduler {
  private driverTimer = 0;
  private cursorElapsed = 0;
  private needsSetValue = true;
  private target: TickChainTarget | null = null;

  start(target: TickChainTarget, fromElapsed: number): void {
    this.stop();
    this.target = target;
    this.cursorElapsed = alignToTickStart(fromElapsed);
    this.needsSetValue = true;
    this.scheduleOneTick();
  }

  stop(): void {
    window.clearTimeout(this.driverTimer);
    this.driverTimer = 0;
    if (this.target) {
      this.cancelScheduledParams(this.target);
    }
    this.target = null;
    this.cursorElapsed = 0;
    this.needsSetValue = true;
  }

  cancelScheduledParams(target: TickChainTarget): void {
    const now = target.context.currentTime;
    target.master.gain.cancelScheduledValues(now);
    for (const channel of [target.left, target.right, target.center]) {
      for (let i = 0; i < CHOIR_MEMBER_COUNT; i++) {
        channel.oscillators[i].frequency.cancelScheduledValues(now);
        channel.voiceGains[i].gain.cancelScheduledValues(now);
      }
    }
  }

  private scheduleOneTick(): void {
    const target = this.target;
    if (!target || target.getPlaybackState() !== "playing") return;

    const duration = target.durationSeconds;
    if (duration > 0 && this.cursorElapsed >= duration - 1e-12) {
      target.onSessionComplete?.();
      return;
    }

    const tick = nextTickAfter(this.cursorElapsed);
    if (tick.periodSeconds <= 0) {
      target.onSessionComplete?.();
      return;
    }

    const audioStart = target.sessionStartAudio + tick.startElapsed;
    const audioEnd = target.sessionStartAudio + tick.endElapsed;
    const now = target.context.currentTime;

    this.scheduleChannelRamp(target, "left", tick.startElapsed, tick.endElapsed, audioStart, audioEnd, now);
    this.scheduleChannelRamp(target, "right", tick.startElapsed, tick.endElapsed, audioStart, audioEnd, now);
    this.scheduleCenterRamp(target, tick.startElapsed, tick.endElapsed, audioStart, audioEnd, now);
    this.scheduleMasterRamp(target, tick.endElapsed, audioStart, audioEnd, now);

    this.needsSetValue = false;
    this.cursorElapsed = tick.endElapsed;

    const delayMs = Math.max(DRIVER_MIN_DELAY_MS, (audioEnd - now) * 1000);
    this.driverTimer = window.setTimeout(() => this.scheduleOneTick(), delayMs);
  }

  private scheduleChannelRamp(
    target: TickChainTarget,
    side: ChannelSide,
    tickStartElapsed: number,
    tickEndElapsed: number,
    audioStart: number,
    audioEnd: number,
    now: number,
  ): void {
    const channel = side === "left" ? target.left : target.right;
    const endSamples = sampleChannelAt(tickEndElapsed, side);

    if (this.needsSetValue && audioStart >= now - 1e-6) {
      const startSamples = sampleChannelAt(tickStartElapsed, side);
      for (let i = 0; i < CHOIR_MEMBER_COUNT; i++) {
        channel.oscillators[i].frequency.setValueAtTime(startSamples[i].frequency, audioStart);
        channel.voiceGains[i].gain.setValueAtTime(startSamples[i].gain, audioStart);
      }
    }

    for (let i = 0; i < CHOIR_MEMBER_COUNT; i++) {
      channel.oscillators[i].frequency.linearRampToValueAtTime(endSamples[i].frequency, audioEnd);
      channel.voiceGains[i].gain.linearRampToValueAtTime(endSamples[i].gain, audioEnd);
    }
  }

  private scheduleMasterRamp(
    target: TickChainTarget,
    tickEndElapsed: number,
    audioStart: number,
    audioEnd: number,
    now: number,
  ): void {
    const gain = target.master.gain;

    if (this.needsSetValue && audioStart >= now - 1e-6) {
      gain.setValueAtTime(gain.value, audioStart);
    }

    gain.linearRampToValueAtTime(computeMasterOutput(tickEndElapsed), audioEnd);
  }

  private scheduleCenterRamp(
    target: TickChainTarget,
    tickStartElapsed: number,
    tickEndElapsed: number,
    audioStart: number,
    audioEnd: number,
    now: number,
  ): void {
    const channel = target.center;
    const endSamples = sampleCenterChannelAt(tickEndElapsed);

    if (this.needsSetValue && audioStart >= now - 1e-6) {
      const startSamples = sampleCenterChannelAt(tickStartElapsed);
      for (let i = 0; i < CHOIR_MEMBER_COUNT; i++) {
        channel.oscillators[i].frequency.setValueAtTime(startSamples[i].frequency, audioStart);
        channel.voiceGains[i].gain.setValueAtTime(startSamples[i].gain, audioStart);
      }
    }

    for (let i = 0; i < CHOIR_MEMBER_COUNT; i++) {
      channel.oscillators[i].frequency.linearRampToValueAtTime(endSamples[i].frequency, audioEnd);
      channel.voiceGains[i].gain.linearRampToValueAtTime(endSamples[i].gain, audioEnd);
    }
  }
}
