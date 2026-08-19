import type { NarratorChannel } from "../../audio/narrator/narratorChannel";
import {
  createSession,
  decodeNarratorBuffer,
  fetchSynthesizedAudio,
  finalizeSession,
  timecodeToSeconds,
  type SessionTimeline,
  type TtsCue,
} from "../../audio/narrator/narratorClient";
import type { SessionRuntime } from "../runtime";

export interface NarratorLoopDeps {
  context: AudioContext;
  channel: NarratorChannel;
  getRuntime: () => SessionRuntime;
  getElapsedSeconds: () => number;
  getUserInput: () => string;
  onTimelineReady: (timeline: SessionTimeline) => void;
  onEffectsReady: () => void;
  onNarrationFinished: () => void;
  onLoopRestart: () => void;
}

/**
 * Озвучка по таймкодам бэкенда: первая фраза — вступление без ритмов,
 * остальные — когда elapsed сессии достигает метки.
 */
export class NarratorLoop {
  private running = false;
  private generation = 0;
  private timeline: SessionTimeline | null = null;
  private nextCueIndex = 1;
  private prefetchCache = new Map<number, Promise<AudioBuffer>>();
  private sleepResolvers = new Set<() => void>();

  constructor(private readonly deps: NarratorLoopDeps) {}

  async start(signal?: AbortSignal): Promise<void> {
    if (this.running) return;
    const generation = ++this.generation;
    this.running = true;
    this.nextCueIndex = 1;
    this.prefetchCache.clear();

    if (!this.timeline) {
      try {
        this.timeline = await createSession(this.deps.getUserInput(), signal);
      } catch (error) {
        this.running = false;
        this.timeline = null;
        throw error;
      }
      if (!this.isCurrent(generation)) return;
      this.deps.onTimelineReady(this.timeline);
    }

    const cues = this.timeline.cues;
    if (cues.length === 0) {
      this.deps.onEffectsReady();
      return;
    }

    void this.prefetch(0);
    await this.speakCue(0, cues[0]);
    if (!this.isCurrent(generation)) return;

    this.deps.onEffectsReady();
    void this.prefetch(1);
    void this.runCueLoop(generation);
  }

  resume(): void {
    if (this.running || !this.timeline) return;
    const generation = ++this.generation;
    this.running = true;
    void this.runCueLoop(generation);
  }

  pause(): void {
    this.cancel();
  }

  stop(): void {
    this.cancel();
    this.nextCueIndex = 1;
    this.prefetchCache.clear();
    void this.closeSession();
    this.timeline = null;
  }

  private async runCueLoop(generation: number): Promise<void> {
    const cues = this.timeline?.cues ?? [];

    while (this.isCurrent(generation)) {
      const runtime = this.deps.getRuntime();
      const elapsed = this.deps.getElapsedSeconds();

      if (this.nextCueIndex >= cues.length) {
        if (elapsed < runtime.durationSeconds) {
          await this.sleep(Math.min((runtime.durationSeconds - elapsed) * 1000, 250));
          continue;
        }

        if (runtime.settings.loop) {
          this.nextCueIndex = 1;
          this.deps.onLoopRestart();
          void this.prefetch(1);
          continue;
        }

        this.deps.onNarrationFinished();
        return;
      }

      const cue = cues[this.nextCueIndex];
      const at = timecodeToSeconds(cue.timecode);
      const waitMs = (at - elapsed) * 1000;
      if (waitMs > 20) {
        await this.sleep(Math.min(waitMs, 250));
        continue;
      }

      const index = this.nextCueIndex;
      this.nextCueIndex += 1;
      void this.prefetch(this.nextCueIndex);
      await this.speakCue(index, cue);
    }
  }

  private prefetch(index: number): void {
    const cue = this.timeline?.cues[index];
    if (!cue || this.prefetchCache.has(index)) return;
    this.prefetchCache.set(index, this.loadCueBuffer(cue));
  }

  private async speakCue(index: number, cue: TtsCue): Promise<void> {
    try {
      const pending = this.prefetchCache.get(index) ?? this.loadCueBuffer(cue);
      this.prefetchCache.delete(index);
      const buffer = await pending;
      await this.deps.channel.play(buffer);
    } catch (error) {
      console.warn("[narrator] фраза пропущена:", error);
    }
  }

  private async loadCueBuffer(cue: TtsCue): Promise<AudioBuffer> {
    const at = timecodeToSeconds(cue.timecode);
    const speed = this.speedAt(at);
    const bytes = await fetchSynthesizedAudio(cue.text, speed);
    return decodeNarratorBuffer(this.deps.context, bytes);
  }

  private speedAt(elapsedSeconds: number): number {
    const runtime = this.deps.getRuntime();
    if (runtime.durationSeconds <= 0) {
      return runtime.intervals[0].narratorSpeed;
    }
    const at = Math.min(elapsedSeconds, Math.max(0, runtime.durationSeconds - 1e-6));
    return runtime.getIntervalPosition(at).interval.narratorSpeed;
  }

  private async closeSession(): Promise<void> {
    const sessionId = this.timeline?.sessionId;
    if (!sessionId) return;

    try {
      await finalizeSession(sessionId);
    } catch (error) {
      console.warn("[narrator] не удалось завершить сессию:", error);
    }
  }

  private cancel(): void {
    this.running = false;
    this.generation++;
    this.deps.channel.stop();
    this.wakeSleepers();
  }

  private isCurrent(generation: number): boolean {
    return this.running && generation === this.generation;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise<void>((resolve) => {
      const wake = () => {
        clearTimeout(timer);
        this.sleepResolvers.delete(wake);
        resolve();
      };
      const timer = setTimeout(wake, ms);
      this.sleepResolvers.add(wake);
    });
  }

  private wakeSleepers(): void {
    for (const wake of [...this.sleepResolvers]) {
      wake();
    }
  }
}
