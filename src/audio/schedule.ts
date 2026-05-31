import { DURATION_SECONDS } from "../session/duration";
import { getSessionSnapshot } from "../session/config";
import { tickPeriodAtElapsed } from "../session/tickModel";
import { computeChannelOutputs } from "./voices/compute";
import { CHOIR_MEMBER_COUNT } from "./voices/harmonic";
import type { ChannelSide } from "./voices/types";

const LOOKAHEAD_SECONDS = 3;
const REFILL_INTERVAL_MS = 400;

export interface ScheduledChannel {
  oscillators: OscillatorNode[];
  voiceGains: GainNode[];
}

export interface SessionScheduleTarget {
  context: AudioContext;
  left: ScheduledChannel;
  right: ScheduledChannel;
  getElapsed: () => number;
  getPlaybackState: () => "stopped" | "playing" | "paused";
  onTick?: (elapsed: number) => void;
  onSessionEnd?: () => void;
}

export class RhythmTickScheduler {
  private scheduledUntilElapsed = 0;
  private refillTimer = 0;

  start(target: SessionScheduleTarget): void {
    this.stop();
    this.scheduledUntilElapsed = target.getElapsed();
    this.refill(target);
    this.refillTimer = window.setInterval(() => this.refill(target), REFILL_INTERVAL_MS);
  }

  stop(): void {
    window.clearInterval(this.refillTimer);
    this.refillTimer = 0;
    this.scheduledUntilElapsed = 0;
  }

  resetElapsed(target: SessionScheduleTarget, elapsed: number): void {
    this.scheduledUntilElapsed = elapsed;
    this.cancelScheduledParams(target);
    if (target.getPlaybackState() === "playing") {
      this.refill(target);
    }
  }

  private cancelScheduledParams(target: SessionScheduleTarget): void {
    const now = target.context.currentTime;
    for (const channel of [target.left, target.right]) {
      for (let i = 0; i < CHOIR_MEMBER_COUNT; i++) {
        channel.oscillators[i].frequency.cancelScheduledValues(now);
        channel.voiceGains[i].gain.cancelScheduledValues(now);
      }
    }
  }

  private refill(target: SessionScheduleTarget): void {
    if (target.getPlaybackState() !== "playing") return;

    const elapsed = target.getElapsed();
    const horizon = elapsed + LOOKAHEAD_SECONDS;

    while (this.scheduledUntilElapsed < horizon && this.scheduledUntilElapsed < DURATION_SECONDS) {
      this.scheduleTick(target, this.scheduledUntilElapsed);
      const period = tickPeriodAtElapsed(this.scheduledUntilElapsed);
      this.scheduledUntilElapsed += period;
      target.onTick?.(this.scheduledUntilElapsed);
    }

    if (elapsed >= DURATION_SECONDS) {
      target.onSessionEnd?.();
    }
  }

  private scheduleTick(target: SessionScheduleTarget, tickStartElapsed: number): void {
    const period = tickPeriodAtElapsed(tickStartElapsed);
    const tickEndElapsed = Math.min(tickStartElapsed + period, DURATION_SECONDS);
    const audioStart = target.context.currentTime + Math.max(0, tickStartElapsed - target.getElapsed());
    const audioEnd = audioStart + (tickEndElapsed - tickStartElapsed);

    this.scheduleChannel(target, "left", tickStartElapsed, tickEndElapsed, audioStart, audioEnd);
    this.scheduleChannel(target, "right", tickStartElapsed, tickEndElapsed, audioStart, audioEnd);
  }

  private scheduleChannel(
    target: SessionScheduleTarget,
    side: ChannelSide,
    tickStartElapsed: number,
    tickEndElapsed: number,
    audioStart: number,
    audioEnd: number,
  ): void {
    const channel = side === "left" ? target.left : target.right;
    const startOutputs = computeChannelOutputs(tickStartElapsed, side);
    const endOutputs = computeChannelOutputs(tickEndElapsed, side);

    for (let i = 0; i < CHOIR_MEMBER_COUNT; i++) {
      const osc = channel.oscillators[i];
      const gain = channel.voiceGains[i].gain;

      osc.frequency.setValueAtTime(startOutputs[i].frequency, audioStart);
      osc.frequency.linearRampToValueAtTime(endOutputs[i].frequency, audioEnd);

      gain.setValueAtTime(startOutputs[i].gain, audioStart);
      gain.linearRampToValueAtTime(endOutputs[i].gain, audioEnd);
    }
  }
}

export function snapshotForUi(elapsed: number) {
  return getSessionSnapshot(elapsed);
}
