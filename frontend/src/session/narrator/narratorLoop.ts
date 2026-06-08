import {
  decodeNarratorBuffer,
  fetchNarratorAudio,
  finalizeNarratorSession,
  initNarratorSession,
} from "../../audio/narrator/narratorClient";
import type { NarratorChannel } from "../../audio/narrator/narratorChannel";
import type { Interval } from "../intervals";
import type { SessionRuntime } from "../runtime";
import {
  intervalContinuePrompt,
  intervalEnterPrompt,
  sessionEndPrompt,
  sessionStartPrompt,
} from "./templates";

export interface NarratorLoopDeps {
  context: AudioContext;
  channel: NarratorChannel;
  getRuntime: () => SessionRuntime;
  getElapsedSeconds: () => number;
  onEffectsReady: () => void;
  onSessionFinished: () => void;
}

/** Скорость речи для вступления и заключения (вне интервалов). */
const INTRO_END_SPEED = 1;

/** Минимальная пауза после вступительной речи перед первой фразой (сек). */
const POST_INTRO_PAUSE_SECONDS = 4;

/**
 * Последовательный цикл нарратора «по факту»: ждёт фактического завершения
 * каждого шага (запрос → воспроизведение → пауза) и только потом смотрит,
 * в каком интервале находится сессия.
 */
export class NarratorLoop {
  private running = false;
  private generation = 0;
  private sessionId: string | null = null;
  private lastSpokenIntervalId: Interval | null = null;
  private sleepResolvers = new Set<() => void>();
  private mainLoopPromise: Promise<void> = Promise.resolve();

  constructor(private readonly deps: NarratorLoopDeps) {}

  /** Старт из stopped: новая сессия → вступление → эффекты → основной цикл. */
  async start(): Promise<void> {
    if (this.running) return;
    const generation = ++this.generation;
    this.running = true;
    this.lastSpokenIntervalId = null;

    await this.openSession();
    if (!this.isCurrent(generation)) return;

    const runtime = this.deps.getRuntime();
    await this.speakSafely(sessionStartPrompt(runtime), INTRO_END_SPEED);

    if (!this.isCurrent(generation)) return;

    this.deps.onEffectsReady();

    await this.sleep(POST_INTRO_PAUSE_SECONDS * 1000);
    if (!this.isCurrent(generation)) return;

    this.mainLoopPromise = this.runMainLoop(generation);
  }

  /** Возобновление из paused: без вступления, цикл с текущего elapsed. */
  resume(): void {
    if (this.running) return;
    const generation = ++this.generation;
    this.running = true;
    this.mainLoopPromise = this.runMainLoop(generation);
  }

  /**
   * Завершение сессии (!loop): даёт текущей фразе доиграть до конца,
   * затем произносит заключительное слово и финиширует.
   */
  async finish(): Promise<void> {
    const generation = this.stopLoopGracefully();

    await this.mainLoopPromise;
    if (generation !== this.generation) return;

    await this.speakSafely(sessionEndPrompt(), INTRO_END_SPEED);
    await this.closeSession();

    if (generation === this.generation) {
      this.deps.onSessionFinished();
    }
  }

  pause(): void {
    this.cancel();
  }

  stop(): void {
    this.cancel();
    this.lastSpokenIntervalId = null;
    void this.closeSession();
  }

  private async runMainLoop(generation: number): Promise<void> {
    while (this.isCurrent(generation)) {
      const runtime = this.deps.getRuntime();
      const elapsed = this.deps.getElapsedSeconds();
      if (runtime.isSessionComplete(elapsed)) return;

      const snapshot = runtime.getSessionSnapshot(elapsed);
      const interval = snapshot.interval;
      const prompt =
        interval.id === this.lastSpokenIntervalId
          ? intervalContinuePrompt(interval)
          : intervalEnterPrompt(interval);

      const spoken = await this.speakSafely(prompt, interval.narratorSpeed);
      if (!this.isCurrent(generation)) return;
      if (spoken) this.lastSpokenIntervalId = interval.id;

      await this.sleep(interval.narratorPauseSeconds * 1000);
      if (!this.isCurrent(generation)) return;
    }
  }

  /** Запрос + воспроизведение; ошибки логируются, шаг пропускается. */
  private async speakSafely(prompt: string, speed: number): Promise<boolean> {
    if (!this.sessionId) return false;

    try {
      const bytes = await fetchNarratorAudio(this.sessionId, prompt, speed);
      const buffer = await decodeNarratorBuffer(this.deps.context, bytes);
      await this.deps.channel.play(buffer);
      return true;
    } catch (error) {
      console.warn("[narrator] фраза пропущена:", error);
      return false;
    }
  }

  /** Открывает новую серверную сессию; при ошибке цикл продолжит без озвучки. */
  private async openSession(): Promise<void> {
    try {
      this.sessionId = await initNarratorSession();
    } catch (error) {
      this.sessionId = null;
      console.warn("[narrator] не удалось создать сессию:", error);
    }
  }

  /** Финализирует серверную сессию и очищает локальный идентификатор. */
  private async closeSession(): Promise<void> {
    const sessionId = this.sessionId;
    this.sessionId = null;
    if (!sessionId) return;

    try {
      await finalizeNarratorSession(sessionId);
    } catch (error) {
      console.warn("[narrator] не удалось завершить сессию:", error);
    }
  }

  /** Жёсткая остановка (pause/stop): обрывает текущую фразу немедленно. */
  private cancel(): void {
    this.running = false;
    this.generation++;
    this.deps.channel.stop();
    this.wakeSleepers();
  }

  /** Мягкая остановка цикла: новых фраз не будет, текущая доигрывает сама. */
  private stopLoopGracefully(): number {
    this.running = false;
    this.generation++;
    this.wakeSleepers();
    return this.generation;
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
