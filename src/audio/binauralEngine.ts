import { DURATION_SECONDS, getSessionSnapshot } from "../session/config";
import { computeAllVoiceOutputs, MIN_FREQUENCY, VOICE_PLAN } from "./voices/compute";

const FADE_SECONDS = 0.4;
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

interface ChannelNodes {
  voiceGains: GainNode[];
  oscillators: OscillatorNode[];
}

export class BinauralSessionEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private leftChannel: ChannelNodes | null = null;
  private rightChannel: ChannelNodes | null = null;

  private playbackState: PlaybackState = "stopped";
  private sessionStartPerf = 0;
  private pausedElapsed = 0;
  private rafId = 0;
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
    this.sessionStartPerf = performance.now() - this.pausedElapsed * 1000;

    this.applySessionState(this.getElapsedSeconds());
    this.fadeMaster(1);
    this.startLoop();
    this.emitValues();
  }

  pause(): void {
    if (this.playbackState !== "playing" || !this.context) return;

    this.pausedElapsed = this.getElapsedSeconds();
    this.playbackState = "paused";
    this.stopLoop();
    this.fadeMaster(0);

    window.setTimeout(() => {
      void this.context?.suspend();
    }, FADE_SECONDS * 1000);

    this.emitValues();
  }

  stop(): void {
    if (!this.context) return;

    this.playbackState = "stopped";
    this.pausedElapsed = 0;
    this.stopLoop();
    this.fadeMaster(0);

    window.setTimeout(() => {
      this.disposeOscillators();
      void this.context?.suspend();
      this.emitValues();
    }, FADE_SECONDS * 1000);
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

    this.leftChannel = this.createChannel(VOICE_PLAN.length);
    this.rightChannel = this.createChannel(VOICE_PLAN.length);

    const merger = this.context.createChannelMerger(2);
    const leftSum = this.context.createGain();
    const rightSum = this.context.createGain();

    for (const gain of this.leftChannel.voiceGains) {
      gain.connect(leftSum);
    }

    for (const gain of this.rightChannel.voiceGains) {
      gain.connect(rightSum);
    }

    leftSum.connect(merger, 0, 0);
    rightSum.connect(merger, 0, 1);
    merger.connect(this.masterGain);
    this.masterGain.connect(this.context.destination);
  }

  private createChannel(oscillatorCount: number): ChannelNodes {
    if (!this.context) throw new Error("AudioContext is not initialized");

    const voiceGains: GainNode[] = [];
    const oscillators: OscillatorNode[] = [];

    for (let i = 0; i < oscillatorCount; i++) {
      const oscillator = this.context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = MIN_FREQUENCY;

      const gain = this.context.createGain();
      gain.gain.value = 0;

      oscillator.connect(gain);
      voiceGains.push(gain);
      oscillators.push(oscillator);
    }

    return { voiceGains, oscillators };
  }

  private startOscillators(): void {
    if (!this.leftChannel || !this.rightChannel) return;

    for (const oscillator of this.leftChannel.oscillators) {
      oscillator.start();
    }

    for (const oscillator of this.rightChannel.oscillators) {
      oscillator.start();
    }
  }

  private disposeOscillators(): void {
    const stopChannel = (channel: ChannelNodes | null) => {
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

    this.leftChannel = null;
    this.rightChannel = null;
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
    if (this.playbackState === "playing") {
      return Math.min(DURATION_SECONDS, (performance.now() - this.sessionStartPerf) / 1000);
    }

    return this.pausedElapsed;
  }

  private applySessionState(elapsed: number): void {
    if (!this.context || !this.leftChannel || !this.rightChannel) return;

    const now = this.context.currentTime;
    const leftOutputs = computeAllVoiceOutputs(elapsed, "left");
    const rightOutputs = computeAllVoiceOutputs(elapsed, "right");

    for (let i = 0; i < VOICE_PLAN.length; i++) {
      this.leftChannel.oscillators[i].frequency.setValueAtTime(leftOutputs[i].frequency, now);
      this.leftChannel.voiceGains[i].gain.setValueAtTime(leftOutputs[i].gain, now);
      this.rightChannel.oscillators[i].frequency.setValueAtTime(rightOutputs[i].frequency, now);
      this.rightChannel.voiceGains[i].gain.setValueAtTime(rightOutputs[i].gain, now);
    }
  }

  private tick = (): void => {
    const elapsed = this.getElapsedSeconds();

    if (elapsed >= DURATION_SECONDS) {
      this.stop();
      return;
    }

    this.applySessionState(elapsed);
    this.emitValues();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private startLoop(): void {
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(this.tick);
  }

  private stopLoop(): void {
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
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
  const labels: Record<string, string> = {
    betaDescent: "Бета спуск",
    alphaDescent: "Альфа спуск",
    thetaDescent: "Тета спуск",
    deltaPlateau: "Дельта плато",
    thetaAscent: "Тета подъём",
    alphaAscent: "Альфа подъём",
    betaAscent: "Бета подъём",
  };
  return labels[kind] ?? kind;
}
