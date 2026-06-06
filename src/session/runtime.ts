import { totalSegments, type IntervalDefinition } from "./intervals";
import { carrierCenterHz } from "./carrierPlan";
import { lerp } from "./math";
import { DEFAULT_SESSION_SETTINGS, getSessionMode, type SessionSettings } from "./settings";

export interface IntervalPosition {
  interval: IntervalDefinition;
  intervalIndex: number;
  progress: number;
  startElapsed: number;
  duration: number;
}

export interface SessionSnapshot {
  elapsed: number;
  interval: IntervalDefinition;
  intervalIndex: number;
  intervalProgress: number;
  rhythm: number;
  carrier: number;
  leftCarrier: number;
  rightCarrier: number;
}

export class SessionRuntime {
  readonly settings: SessionSettings;
  readonly intervals: IntervalDefinition[];
  readonly durationSeconds: number;
  readonly segmentDuration: number;

  constructor(settings: SessionSettings = DEFAULT_SESSION_SETTINGS) {
    this.settings = { ...settings };
    this.intervals = getSessionMode(this.settings.mode).intervals;
    this.durationSeconds = this.settings.durationMinutes * 60;
    this.segmentDuration = this.durationSeconds / totalSegments(this.intervals);
  }

  intervalDuration(interval: IntervalDefinition): number {
    return interval.segments * this.segmentDuration;
  }

  intervalDurationAt(index: number): number {
    return this.intervalDuration(this.intervals[index]);
  }

  intervalEndElapsed(index: number): number {
    let elapsed = 0;
    for (let i = 0; i <= index; i++) {
      elapsed += this.intervalDurationAt(i);
    }
    return elapsed;
  }

  sessionPhaseElapsed(elapsedSeconds: number): number {
    if (this.durationSeconds <= 0) return 0;

    const clamped = Math.max(0, elapsedSeconds);
    if (!this.settings.loop) {
      return Math.min(clamped, this.durationSeconds);
    }

    const mod = clamped % this.durationSeconds;
    return mod < 0 ? mod + this.durationSeconds : mod;
  }

  getIntervalPosition(elapsedSeconds: number): IntervalPosition {
    const elapsed = this.sessionPhaseElapsed(elapsedSeconds);
    let startElapsed = 0;

    for (let intervalIndex = 0; intervalIndex < this.intervals.length; intervalIndex++) {
      const interval = this.intervals[intervalIndex];
      const duration = this.intervalDuration(interval);
      const endElapsed = startElapsed + duration;

      if (elapsed < endElapsed || intervalIndex === this.intervals.length - 1) {
        const progress = duration > 0 ? (elapsed - startElapsed) / duration : 1;
        return {
          interval,
          intervalIndex,
          progress: Math.min(1, Math.max(0, progress)),
          startElapsed,
          duration,
        };
      }

      startElapsed = endElapsed;
    }

    const last = this.intervals[this.intervals.length - 1];
    return {
      interval: last,
      intervalIndex: this.intervals.length - 1,
      progress: 1,
      startElapsed: this.durationSeconds - this.intervalDuration(last),
      duration: this.intervalDuration(last),
    };
  }

  getRhythmAt(position: IntervalPosition): number {
    const { interval, progress } = position;
    return lerp(interval.rhythmStart, interval.rhythmEnd, progress);
  }

  getSessionSnapshot(elapsedSeconds: number): SessionSnapshot {
    const phase = this.sessionPhaseElapsed(elapsedSeconds);
    const position = this.getIntervalPosition(phase);
    const rhythm = this.getRhythmAt(position);
    const carrier = carrierCenterHz(position.interval, position.progress);
    const halfRhythm = rhythm / 2;

    return {
      elapsed: phase,
      interval: position.interval,
      intervalIndex: position.intervalIndex,
      intervalProgress: position.progress,
      rhythm,
      carrier,
      leftCarrier: carrier - halfRhythm,
      rightCarrier: carrier + halfRhythm,
    };
  }

  isSessionComplete(absoluteElapsed: number): boolean {
    return !this.settings.loop && absoluteElapsed >= this.durationSeconds - 1e-9;
  }
}
