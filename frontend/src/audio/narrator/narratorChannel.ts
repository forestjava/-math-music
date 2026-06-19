const NARRATOR_OUTPUT_LEVEL = 0.5;

/** Канал речи нарратора: параллельный выход в destination рядом с masterGain. */
export class NarratorChannel {
  private readonly gain: GainNode;
  private currentSource: AudioBufferSourceNode | null = null;
  private pendingResolve: (() => void) | null = null;

  constructor(private readonly context: AudioContext) {
    this.gain = context.createGain();
    this.gain.gain.value = NARRATOR_OUTPUT_LEVEL;
    this.gain.connect(context.destination);
  }

  /**
   * Воспроизводит буфер и завершает промис по фактическому onended.
   * Если воспроизведение прервано через stop(), промис тоже завершается.
   */
  play(buffer: AudioBuffer): Promise<void> {
    this.stop();

    return new Promise<void>((resolve) => {
      const source = new AudioBufferSourceNode(this.context, { buffer });
      source.connect(this.gain);
      source.onended = () => this.finishPlayback();
      this.currentSource = source;
      this.pendingResolve = resolve;
      source.start();
    });
  }

  stop(): void {
    if (this.currentSource) {
      const source = this.currentSource;
      source.onended = null;
      try {
        source.stop();
        source.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.finishPlayback();
  }

  dispose(): void {
    this.stop();
    this.gain.disconnect();
  }

  private finishPlayback(): void {
    if (this.currentSource) {
      this.currentSource.disconnect();
      this.currentSource = null;
    }

    const resolve = this.pendingResolve;
    this.pendingResolve = null;
    if (resolve) resolve();
  }
}
