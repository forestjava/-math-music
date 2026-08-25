import { setActiveSessionRuntime } from "../session/activeRuntime";
import type { Interval } from "../session/intervals";
import { SessionRuntime } from "../session/runtime";
import { abandonScenario, waitForScenario, ScenarioError, type SessionScenario, type ScenarioProgressEvent } from "../session/scenario";
import type { SessionSettings } from "../session/settings";
import { NarratorLoop } from "./narrator/narratorLoop";
import { NarratorChannel } from "./narrator/narratorChannel";
import { CHOIR_MEMBER_COUNT } from "./voices/harmonic";
import { sampleCenterChannelAt, sampleChannelAt } from "./voices/compute";
import { TickChainScheduler, type ScheduledChannel } from "./tickChain";
import { randomPhaseWave } from "./waveform";

const FADE_SECONDS = 0.2;
const FADE_DELAY_MS = FADE_SECONDS * 1000 + 100;

export type PlaybackState = "stopped" | "preparing" | "playing" | "paused";

export type EngineLogEvent =
  | { type: "clear" }
  | { type: "line"; text: string; kind: "info" | "error" };

export interface LiveValues {
  playbackState: PlaybackState;
  elapsed: number;
  absoluteElapsed: number;
  durationSeconds: number;
  loop: boolean;
  rhythm: number;
  carrier: number;
  leftCarrier: number;
  rightCarrier: number;
  intervalId: Interval;
  error: string | null;
}

type ValuesListener = (values: LiveValues) => void;
type LogListener = (event: EngineLogEvent) => void;

export class BinauralSessionEngine {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private leftChannel: ScheduledChannel | null = null;
  private rightChannel: ScheduledChannel | null = null;
  private centerChannel: ScheduledChannel | null = null;
  private readonly scheduler = new TickChainScheduler();

  private narratorChannel: NarratorChannel | null = null;
  private narratorLoop: NarratorLoop | null = null;
  private scenarioId: string | null = null;
  private effectsStarted = false;
  private prepareAbort: AbortController | null = null;
  private lastError: string | null = null;

  private playbackState: PlaybackState = "stopped";
  private sessionStartAudio = 0;
  private pausedElapsed = 0;
  private uiRafId = 0;
  private valuesListener: ValuesListener | null = null;
  private logListener: LogListener | null = null;
  private settings: SessionSettings;
  private runtime: SessionRuntime;

  constructor(settings: SessionSettings) {
    this.settings = { ...settings };
    this.runtime = new SessionRuntime(this.settings, 0);
    setActiveSessionRuntime(this.runtime);
  }

  getSessionSettings(): SessionSettings {
    return { ...this.settings };
  }

  getSessionRuntime(): SessionRuntime {
    return this.runtime;
  }

  setSessionSettings(settings: SessionSettings): boolean {
    if (this.playbackState !== "stopped") return false;

    this.settings = { ...settings };
    this.runtime = new SessionRuntime(this.settings, this.runtime.durationSeconds);
    setActiveSessionRuntime(this.runtime);
    this.emitValues();
    return true;
  }

  setValuesListener(listener: ValuesListener | null): void {
    this.valuesListener = listener;
  }

  setLogListener(listener: LogListener | null): void {
    this.logListener = listener;
  }

  getPlaybackState(): PlaybackState {
    return this.playbackState;
  }

  async play(): Promise<void> {
    if (this.playbackState === "playing" || this.playbackState === "preparing") return;

    if (!this.context) {
      this.context = new AudioContext();
      this.buildGraph();
      this.createNarrator();
    }

    if (this.context.state === "suspended") {
      await this.context.resume();
    }

    setActiveSessionRuntime(this.runtime);

    if (this.playbackState === "paused") {
      this.playbackState = "playing";
      this.lastError = null;
      this.log("продолжение");
      if (this.effectsStarted) {
        this.beginEffects();
        this.narratorLoop?.resume();
      } else {
        await this.narratorLoop?.start();
      }
      return;
    }

    this.prepareAbort = new AbortController();
    this.playbackState = "preparing";
    this.lastError = null;
    this.pausedElapsed = 0;
    this.emitLog({ type: "clear" });
    this.emitValues();

    try {
      const scenario = await waitForScenario(
        this.settings.userInput,
        this.prepareAbort.signal,
        (event) => this.logScenarioProgress(event),
      );
      if (this.prepareAbort.signal.aborted) {
        void abandonScenario(scenario.sessionId);
        this.playbackState = "stopped";
        this.emitValues();
        return;
      }

      this.scenarioId = scenario.sessionId;
      this.applyTimeline(scenario);
      await this.narratorLoop?.start(scenario.cues);
    } catch (error) {
      this.closeScenario();
      if (this.prepareAbort.signal.aborted) {
        this.playbackState = "stopped";
        this.emitValues();
        return;
      }

      this.lastError = error instanceof Error ? error.message : "Не удалось получить таймлайн сессии";
      this.log(this.lastError, "error");
      if (error instanceof ScenarioError && error.agentOutput) {
        this.log(error.agentOutput, "error");
      }
      this.playbackState = "stopped";
      this.emitValues();
    }
  }

  /** Запуск аудиальных эффектов (вызывается нарратором после вступления). */
  private beginEffects(): void {
    if (!this.context) return;

    if (!this.effectsStarted) {
      this.startOscillators();
      this.effectsStarted = true;
      this.log("запуск ритмов");
    }

    this.sessionStartAudio = this.context.currentTime - this.pausedElapsed;
    this.applyImmediateState(this.getElapsedSeconds());
    this.startScheduler();
    this.startUiLoop();
    this.emitValues();
  }

  private createNarrator(): void {
    if (!this.context) return;

    this.narratorChannel = new NarratorChannel(this.context);
    this.narratorLoop = new NarratorLoop({
      context: this.context,
      channel: this.narratorChannel,
      getElapsedSeconds: () => this.getElapsedSeconds(),
      getDurationSeconds: () => this.runtime.durationSeconds,
      isLoopEnabled: () => this.settings.loop,
      getNarratorSpeed: (elapsedSeconds) => this.narratorSpeedAt(elapsedSeconds),
      onEffectsReady: () => this.beginEffects(),
      onNarrationFinished: () => this.finalizeSession(),
      onLoopRestart: () => this.restartEffectsPass(),
      onSpeakCue: ({ index, total, cue }) => {
        this.log(`озвучание реплики ${index + 1}/${total} [${cue.timecode}]`);
      },
      onSpeakFailed: (index) => {
        this.log(`реплика ${index + 1} пропущена`, "error");
      },
    });
  }

  private narratorSpeedAt(elapsedSeconds: number): number {
    if (this.runtime.durationSeconds <= 0) {
      return this.runtime.intervals[0].narratorSpeed;
    }
    const at = Math.min(elapsedSeconds, Math.max(0, this.runtime.durationSeconds - 1e-6));
    return this.runtime.getIntervalPosition(at).interval.narratorSpeed;
  }

  private applyTimeline(scenario: SessionScenario): void {
    this.runtime = new SessionRuntime(this.settings, scenario.durationSeconds);
    setActiveSessionRuntime(this.runtime);
    this.playbackState = "playing";
    this.emitValues();
  }

  pause(): void {
    if (this.playbackState !== "playing" || !this.context) return;

    this.pausedElapsed = this.effectsStarted ? this.getElapsedSeconds() : 0;
    this.playbackState = "paused";
    this.scheduler.stop();
    this.stopUiLoop();
    this.narratorLoop?.pause();
    this.log("пауза");

    this.fadeMaster(0);
    window.setTimeout(() => {
      void this.context?.suspend();
    }, FADE_DELAY_MS);

    this.emitValues();
  }

  stop(): void {
    const wasActive = this.playbackState !== "stopped" || this.context !== null;
    this.prepareAbort?.abort();
    this.prepareAbort = null;
    if (!this.context) {
      this.playbackState = "stopped";
      if (wasActive) this.log("остановка");
      this.emitValues();
      return;
    }

    this.playbackState = "stopped";
    this.pausedElapsed = 0;
    this.effectsStarted = false;
    this.scheduler.stop();
    this.stopUiLoop();
    this.narratorLoop?.stop();
    this.closeScenario();
    if (wasActive) this.log("остановка");

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

    this.narratorChannel?.dispose();
    this.narratorChannel = null;
    this.narratorLoop = null;

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
    this.masterGain.gain.linearRampToValueAtTime(target, now + FADE_SECONDS);
  }

  private getElapsedSeconds(): number {
    if (!this.effectsStarted) return this.pausedElapsed;

    if (this.playbackState === "playing" && this.context) {
      return Math.max(0, this.context.currentTime - this.sessionStartAudio);
    }

    return this.pausedElapsed;
  }

  private applyImmediateState(elapsed: number): void {
    if (!this.context || !this.leftChannel || !this.rightChannel || !this.centerChannel) return;

    const now = this.context.currentTime;
    const leftOutputs = sampleChannelAt(elapsed, "left");
    const rightOutputs = sampleChannelAt(elapsed, "right");
    const centerOutputs = sampleCenterChannelAt(elapsed);

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
    if (!this.context || !this.masterGain || !this.leftChannel || !this.rightChannel || !this.centerChannel) {
      return;
    }

    this.scheduler.start(
      {
        context: this.context,
        master: this.masterGain,
        left: this.leftChannel,
        right: this.rightChannel,
        center: this.centerChannel,
        sessionStartAudio: this.sessionStartAudio,
        durationSeconds: this.runtime.durationSeconds,
        getPlaybackState: () => (this.playbackState === "preparing" ? "stopped" : this.playbackState),
        onSessionComplete: () => this.handleSessionComplete(),
      },
      this.getElapsedSeconds(),
    );
  }

  private handleSessionComplete(): void {
    if (this.playbackState !== "playing") return;

    this.scheduler.stop();
    this.stopUiLoop();
    this.fadeMaster(0);
    this.emitValues();
  }

  private restartEffectsPass(): void {
    if (this.playbackState !== "playing" || !this.context) return;

    this.pausedElapsed = 0;
    this.log("повтор цикла");
    this.beginEffects();
  }

  private finalizeSession(): void {
    this.playbackState = "stopped";
    this.pausedElapsed = 0;
    this.effectsStarted = false;
    this.narratorLoop?.stop();
    this.closeScenario();
    this.log("завершение сессии");

    window.setTimeout(() => {
      this.disposeOscillators();
    }, FADE_DELAY_MS);
    this.emitValues();
  }

  private closeScenario(): void {
    const sessionId = this.scenarioId;
    this.scenarioId = null;
    if (!sessionId) return;
    void abandonScenario(sessionId);
  }

  /** rAF-цикл отвечает только за отрисовку UI; аудио-параметры планируются по тикам. */
  private startUiLoop(): void {
    this.stopUiLoop();

    const loop = () => {
      if (this.playbackState !== "playing") return;

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

    const absoluteElapsed = this.getElapsedSeconds();
    const snapshot = this.runtime.getSessionSnapshot(absoluteElapsed);

    this.valuesListener({
      playbackState: this.playbackState,
      elapsed: snapshot.elapsed,
      absoluteElapsed,
      durationSeconds: this.runtime.durationSeconds,
      loop: this.settings.loop,
      rhythm: snapshot.rhythm,
      carrier: snapshot.carrier,
      leftCarrier: snapshot.leftCarrier,
      rightCarrier: snapshot.rightCarrier,
      intervalId: snapshot.interval.id,
      error: this.lastError,
    });
  }

  private logScenarioProgress(event: ScenarioProgressEvent): void {
    switch (event.phase) {
      case "request":
        this.log("отправка запроса сессии");
        return;
      case "accepted":
        this.log(`сессия ${event.sessionId.slice(0, 8)} · ${event.status}`);
        return;
      case "check":
        this.log(`проверка статуса: ${event.status}`);
        return;
      case "check-retry":
        this.log("сбой проверки, повтор");
        return;
      case "ready":
        this.log(`получен сценарий: ${event.cueCount} реплик, ${formatDuration(event.durationSeconds)} минут`);
        return;
    }
  }

  private log(text: string, kind: "info" | "error" = "info"): void {
    this.emitLog({ type: "line", text, kind });
  }

  private emitLog(event: EngineLogEvent): void {
    this.logListener?.(event);
  }
}

function formatDuration(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}
