import { DURATION_SECONDS } from "../session/duration";
import { getSessionSnapshot, type IntervalKind } from "../session/config";
import { CHOIR_MEMBER_COUNT } from "./voices/harmonic";
import { computeCenterOutputs, computeChannelOutputs } from "./voices/compute";
import { TickChainScheduler, type ScheduledChannel } from "./tickChain";
import { randomPhaseWave } from "./waveform";

const FADE_SECONDS = 0.2;
const FADE_DELAY_MS = FADE_SECONDS * 1000 + 100;
const MASTER_OUTPUT_LEVEL = 0.18;

export type PlaybackState = "stopped" | "playing" | "paused";

export interface LiveValues {
  playbackState: PlaybackState;
  elapsed: number;
  rhythm: number;
  carrier: number;
  leftCarrier: number;
  rightCarrier: number;
  intervalLabel: string;
}

type ValuesListener = (values: LiveValues) => void;

export class BinauralSessionEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private leftChannel: ScheduledChannel | null = null;
  private rightChannel: ScheduledChannel | null = null;
  private centerChannel: ScheduledChannel | null = null;
  private readonly scheduler = new TickChainScheduler();

  private playbackState: PlaybackState = "stopped";
  private sessionStartAudio = 0;
  private pausedElapsed = 0;
  private uiRafId = 0;
  private valuesListener: ValuesListener | null = null;

  setValuesListener(listener: ValuesListener | null): void {
    this.valuesListener = listener;
  }

  getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  async play(): Promise<void> {
    if (this.playbackState === "playing") return;

    if (!this.context) {
      this.context = new AudioContext();
      this.buildGraph();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    if (this.playbackState === "stopped") {
      this.pausedElapsed = 0;
      this.startOscillators();
    }

    this.playbackState = "playing";
    this.sessionStartAudio = this.context.currentTime - this.pausedElapsed;

    this.applyImmediateState(this.getElapsedSeconds());
    this.fadeMaster(1);
    this.startScheduler();
    this.startUiLoop();
    this.emitValues();
  }

  pause(): void {
    if (this.playbackState !== "playing" || !this.context) return;

    this.pausedElapsed = this.getElapsedSeconds();
    this.playbackState = "paused";
    this.scheduler.stop();
    this.stopUiLoop();

    this.fadeMaster(0);
    window.setTimeout(() => {
      void this.context?.suspend();
    }, FADE_DELAY_MS);

    this.emitValues();
  }

  stop(): void {
    if (!this.context) return;

    this.playbackState = "stopped";
    this.pausedElapsed = 0;
    this.scheduler.stop();
    this.stopUiLoop();

    this.fadeMaster(0);
    window.setTimeout(() => {
      this.disposeOscillators();
      void this.context?.suspend();
    }, FADE_DELAY_MS);
  }

  toggle(): Promise<void> {
    if (this.playbackState === "playing") {
      this.pause();
      return Promise.resolve();
    }

    return this.play();
  }

  private buildGraph(): void {
    if (!this.context) return;

    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0;

    this.leftChannel = this.createChannel();
    this.rightChannel = this.createChannel();
    this.centerChannel = this.createChannel();

    const merger = this.context.createChannelMerger(2);
    const leftSum = this.context.createGain();
    const rightSum = this.context.createGain();
    const centerSum = this.context.createGain();

    for (const gain of this.leftChannel.voiceGains) {
      gain.connect(leftSum);
    }

    for (const gain of this.rightChannel.voiceGains) {
      gain.connect(rightSum);
    }

    for (const gain of this.centerChannel.voiceGains) {
      gain.connect(centerSum);
    }

    leftSum.connect(merger, 0, 0);
    rightSum.connect(merger, 0, 1);
    merger.connect(this.masterGain);
    centerSum.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
  }

  private createChannel(): ScheduledChannel {
    if (!this.context) throw new Error("AudioContext is not initialized");

    const voiceGains: GainNode[] = [];
    const oscillators: OscillatorNode[] = [];

    for (let i = 0; i < CHOIR_MEMBER_COUNT; i++) {
      const oscillator = this.context.createOscillator();
      randomPhaseWave(oscillator, this.context);

      const gain = this.context.createGain();
      gain.gain.value = 0;

      oscillator.connect(gain);
      voiceGains.push(gain);
      oscillators.push(oscillator);
    }

    return { voiceGains, oscillators };
  }

  private startOscillators(): void {
    if (!this.leftChannel || !this.rightChannel || !this.centerChannel) return;

    for (const oscillator of this.leftChannel.oscillators) {
      oscillator.start();
    }

    for (const oscillator of this.rightChannel.oscillators) {
      oscillator.start();
    }

    for (const oscillator of this.centerChannel.oscillators) {
      oscillator.start();
    }
  }

  private disposeOscillators(): void {
    const stopChannel = (channel: ScheduledChannel | null) => {
      if (!channel) return;
      for (const oscillator of channel.oscillators) {
        try {
          oscillator.stop();
          oscillator.disconnect();
        } catch {
          /* already stopped */
        }
      }

      for (const gain of channel.voiceGains) {
        gain.disconnect();
      }
    };

    stopChannel(this.leftChannel);
    stopChannel(this.rightChannel);
    stopChannel(this.centerChannel);

    this.leftChannel = null;
    this.rightChannel = null;
    this.centerChannel = null;
    this.masterGain = null;

    if (this.context) {
      void this.context.close();
      this.context = null;
    }
  }

  private fadeMaster(target: number): void {
    if (!this.context || !this.masterGain) return;

    const now = this.context.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(target * MASTER_OUTPUT_LEVEL, now + FADE_SECONDS);
  }

  private getElapsedSeconds(): number {
    if (this.playbackState === "playing" && this.context) {
      return Math.min(DURATION_SECONDS, this.context.currentTime - this.sessionStartAudio);
    }

    return this.pausedElapsed;
  }

  private applyImmediateState(elapsed: number): void {
    if (!this.context || !this.leftChannel || !this.rightChannel || !this.centerChannel) return;

    const now = this.context.currentTime;
    const leftOutputs = computeChannelOutputs(elapsed, "left");
    const rightOutputs = computeChannelOutputs(elapsed, "right");
    const centerOutputs = computeCenterOutputs(elapsed);

    for (let i = 0; i < CHOIR_MEMBER_COUNT; i++) {
      this.leftChannel.oscillators[i].frequency.setValueAtTime(leftOutputs[i].frequency, now);
      this.leftChannel.voiceGains[i].gain.setValueAtTime(leftOutputs[i].gain, now);
      this.rightChannel.oscillators[i].frequency.setValueAtTime(rightOutputs[i].frequency, now);
      this.rightChannel.voiceGains[i].gain.setValueAtTime(rightOutputs[i].gain, now);
      this.centerChannel.oscillators[i].frequency.setValueAtTime(centerOutputs[i].frequency, now);
      this.centerChannel.voiceGains[i].gain.setValueAtTime(centerOutputs[i].gain, now);
    }
  }

  private startScheduler(): void {
    if (!this.context || !this.leftChannel || !this.rightChannel || !this.centerChannel) return;

    this.scheduler.start(
      {
        context: this.context,
        left: this.leftChannel,
        right: this.rightChannel,
        center: this.centerChannel,
        sessionStartAudio: this.sessionStartAudio,
        getPlaybackState: () => this.playbackState,
        onSessionEnd: () => this.stop(),
      },
      this.getElapsedSeconds(),
    );
  }

  private startUiLoop(): void {
    this.stopUiLoop();

    const loop = () => {
      if (this.playbackState !== "playing") return;

      const elapsed = this.getElapsedSeconds();
      if (elapsed >= DURATION_SECONDS) {
        this.stop();
        return;
      }

      this.emitValues();
      this.uiRafId = requestAnimationFrame(loop);
    };

    this.uiRafId = requestAnimationFrame(loop);
  }

  private stopUiLoop(): void {
    if (this.uiRafId) {
      cancelAnimationFrame(this.uiRafId);
    }
    this.uiRafId = 0;
  }

  private emitValues(): void {
    if (!this.valuesListener) return;

    const snapshot = getSessionSnapshot(this.getElapsedSeconds());

    this.valuesListener({
      playbackState: this.playbackState,
      elapsed: snapshot.elapsed,
      rhythm: snapshot.rhythm,
      carrier: snapshot.carrier,
      leftCarrier: snapshot.leftCarrier,
      rightCarrier: snapshot.rightCarrier,
      intervalLabel: snapshot.interval.kind,
    });
  }
}

export function formatTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function intervalLabel(kind: string): string {
  const labels: Record<IntervalKind, string> = {
    betaDescent: "Бета спуск",
    alphaDescent: "Альфа спуск",
    thetaDescent: "Тета спуск",
    deltaDescent: "Дельта спуск",
    deltaPlateau: "Дельта плато",
    deltaAscent: "Дельта подъём",
    thetaAscent: "Тета подъём",
    alphaAscent: "Альфа подъём",
    betaAscent: "Бета подъём",
  };
  return labels[kind as IntervalKind] ?? kind;
}
