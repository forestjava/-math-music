import type { NarratorChannel } from "./narratorChannel";
import { decodeNarratorBuffer, fetchSynthesizedAudio } from "./synthesize";

export interface NarratorCue {
  timecode: string;
  text: string;
}

export interface NarratorLoopDeps {
  context: AudioContext;
  channel: NarratorChannel;
  getElapsedSeconds: () => number;
  getDurationSeconds: () => number;
  isLoopEnabled: () => boolean;
  getNarratorSpeed: (elapsedSeconds: number) => number;
  onEffectsReady: () => void;
  onNarrationFinished: () => void;
  onLoopRestart: () => void;
}

/**
 * Озвучка по таймкодам: первая фраза — вступление без ритмов,
 * остальные — когда elapsed сессии достигает метки.
 */
export class NarratorLoop {
  private running = false;
  private generation = 0;
  private cues: NarratorCue[] = [];
  private nextCueIndex = 1;
  private prefetchCache = new Map<number, Promise<AudioBuffer>>();
  private sleepResolvers = new Set<() => void>();

  constructor(private readonly deps: NarratorLoopDeps) {}

  async start(cues?: NarratorCue[]): Promise<void> {
    if (this.running) return;
    const generation = ++this.generation;
    this.running = true;
    this.nextCueIndex = 1;
    this.prefetchCache.clear();

    if (cues) {
      this.cues = cues;
    }

    if (this.cues.length === 0) {
      this.deps.onEffectsReady();
      return;
    }

    void this.prefetch(0);
    await this.speakCue(0, this.cues[0]);
    if (!this.isCurrent(generation)) return;

    this.deps.onEffectsReady();
    void this.prefetch(1);
    void this.runCueLoop(generation);
  }

  resume(): void {
    if (this.running || this.cues.length === 0) return;
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
    this.cues = [];
  }

  private async runCueLoop(generation: number): Promise<void> {
    const cues = this.cues;

    while (this.isCurrent(generation)) {
      const durationSeconds = this.deps.getDurationSeconds();
      const elapsed = this.deps.getElapsedSeconds();

      if (this.nextCueIndex >= cues.length) {
        if (elapsed < durationSeconds) {
          await this.sleep(Math.min((durationSeconds - elapsed) * 1000, 250));
          continue;
        }

        if (this.deps.isLoopEnabled()) {
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
    const cue = this.cues[index];
    if (!cue || this.prefetchCache.has(index)) return;
    this.prefetchCache.set(index, this.loadCueBuffer(cue));
  }

  private async speakCue(index: number, cue: NarratorCue): Promise<void> {
    try {
      const pending = this.prefetchCache.get(index) ?? this.loadCueBuffer(cue);
      this.prefetchCache.delete(index);
      const buffer = await pending;
      await this.deps.channel.play(buffer);
    } catch (error) {
      console.warn("[narrator] фраза пропущена:", error);
    }
  }

  private async loadCueBuffer(cue: NarratorCue): Promise<AudioBuffer> {
    const at = timecodeToSeconds(cue.timecode);
    const bytes = await fetchSynthesizedAudio(cue.text, this.deps.getNarratorSpeed(at));
    return decodeNarratorBuffer(this.deps.context, bytes);
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

function timecodeToSeconds(timecode: string): number {
  const [hours, minutes, seconds] = timecode.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}
