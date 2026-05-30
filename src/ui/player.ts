import {
  BinauralSessionEngine,
  formatTime,
  intervalLabel,
  type LiveValues,
} from "../audio/binauralEngine";
import { DURATION_SECONDS, INTERVALS, INTERVAL_LABELS, DURATION_MINUTES } from "../session/config";

export function mountPlayer(root: HTMLElement): void {
  const engine = new BinauralSessionEngine();
  root.innerHTML = `
    <main class="player">
      <header class="player__header">
        <h1>Binaural Session</h1>
        <p class="player__subtitle">
          ${DURATION_MINUTES} мин · Web Audio API
        </p>
      </header>
      <div class="player__controls">
        <button type="button" class="player__button" data-action="toggle">Play</button>
        <button type="button" class="player__button player__button--secondary" data-action="stop">Stop</button>
      </div>
      <section class="player__timeline">
        <div class="player__time-row">
          <span data-el="elapsed">00:00</span>
          <span data-el="phase">—</span>
          <span data-el="total">${formatTime(DURATION_SECONDS)}</span>
        </div>
        <div class="player__track">
          <div class="player__progress" data-el="progress"></div>
          <div class="player__intervals" data-el="intervals"></div>
        </div>
      </section>
      <section class="player__metrics">
        <dl>
          <div><dt>Ритм</dt><dd data-el="rhythm">—</dd></div>
          <div><dt>Несущая</dt><dd data-el="carrier">—</dd></div>
          <div><dt>L канал</dt><dd data-el="left">—</dd></div>
          <div><dt>R канал</dt><dd data-el="right">—</dd></div>
        </dl>
      </section>
    </main>
  `;
  const toggleButton = root.querySelector<HTMLButtonElement>('[data-action="toggle"]')!;
  const stopButton = root.querySelector<HTMLButtonElement>('[data-action="stop"]')!;
  const intervalsEl = root.querySelector<HTMLDivElement>('[data-el="intervals"]')!;
  renderIntervalMarkers(intervalsEl);
  toggleButton.addEventListener("click", () => {
    void engine.toggle().then(() => updateButtonLabel());
  });
  stopButton.addEventListener("click", () => {
    engine.stop();
    updateButtonLabel();
  });
  engine.setValuesListener((values) => {
    updateUi(root, values);
    updateButtonLabel(values.playbackState);
  });

  function updateButtonLabel(state = engine.getPlaybackState()): void {
    toggleButton.textContent = state === "playing" ? "Pause" : "Play";
  }
}

function renderIntervalMarkers(container: HTMLElement): void {
  for (const interval of INTERVALS) {
    const marker = document.createElement("span");
    marker.className = `player__interval player__interval--${interval.kind}`;
    marker.style.flex = String(interval.segments);
    marker.title = INTERVAL_LABELS[interval.kind];
    container.appendChild(marker);
  }
}

function updateUi(root: HTMLElement, values: LiveValues): void {
  const progress = values.elapsed / DURATION_SECONDS;
  setText(root, "elapsed", formatTime(values.elapsed));
  setText(root, "phase", intervalLabel(values.intervalLabel));
  setText(root, "rhythm", `${values.rhythm.toFixed(2)} Hz`);
  setText(root, "carrier", `${values.carrier.toFixed(1)} Hz`);
  setText(root, "left", `${values.leftCarrier.toFixed(1)} Hz`);
  setText(root, "right", `${values.rightCarrier.toFixed(1)} Hz`);
  const progressEl = root.querySelector<HTMLDivElement>('[data-el="progress"]');
  if (progressEl) {
    progressEl.style.width = `${Math.min(100, progress * 100)}%`;
  }
}

function setText(root: HTMLElement, key: string, value: string): void {
  const el = root.querySelector(`[data-el="${key}"]`);
  if (el) el.textContent = value;
}
