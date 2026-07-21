import {
  BinauralSessionEngine,
  formatTime,
  type LiveValues,
} from "../audio/binauralEngine";
import { getActiveSessionRuntime } from "../session/activeRuntime";
import type { IntervalDefinition } from "../session/intervals";
import {
  DEFAULT_SESSION_SETTINGS,
  FAST_SESSION_MODE,
  SOFT_SESSION_MODE,
  getSessionModeDefinition,
  type SessionMode,
  type SessionSettings,
} from "../session/settings";

let playerRoot: HTMLElement | null = null;

export function mountPlayer(root: HTMLElement): void {
  playerRoot = root;
  let settings: SessionSettings = { ...DEFAULT_SESSION_SETTINGS };
  const engine = new BinauralSessionEngine(settings);

  root.innerHTML = `
    <main class="player">
      <header class="player__header">
        <h1>Binaural Session</h1>
        <p class="player__subtitle" data-el="subtitle">Web Audio API</p>
      </header>
      <section class="player__settings">
        <label class="player__field">
          <span class="player__field-label">Продолжительность сессии</span>
          <div class="player__field-control">
            <input
              type="number"
              class="player__input"
              data-setting="duration"
              step="any"
              value="${settings.durationMinutes}"
            />
            <span class="player__field-suffix">мин</span>
          </div>
        </label>
        <fieldset class="player__field player__field--mode">
          <span class="player__field-label">Режим сессии</span>
          <div class="player__mode-toggle" role="group" aria-label="Режим сессии">
            <label class="player__mode-option">
              <input type="radio" name="session-mode" value="soft" data-setting="mode-soft" checked />
              <span>${SOFT_SESSION_MODE.label}</span>
            </label>
            <label class="player__mode-option">
              <input type="radio" name="session-mode" value="fast" data-setting="mode-fast" />
              <span>${FAST_SESSION_MODE.label}</span>
            </label>
          </div>
        </fieldset>
        <label class="player__field player__field--checkbox">
          <input type="checkbox" class="player__checkbox" data-setting="loop" />
          <span>Зациклить</span>
        </label>
      </section>
      <div class="player__controls">
        <button type="button" class="player__button" data-action="toggle">Play</button>
        <button type="button" class="player__button player__button--secondary" data-action="stop">Stop</button>
      </div>
      <section class="player__timeline">
        <div class="player__time-row">
          <span data-el="elapsed">00:00</span>
          <span data-el="phase">—</span>
          <span data-el="total">${formatTime(settings.durationMinutes * 60)}</span>
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
  const durationInput = root.querySelector<HTMLInputElement>('[data-setting="duration"]')!;
  const loopCheckbox = root.querySelector<HTMLInputElement>('[data-setting="loop"]')!;
  const modeSoftInput = root.querySelector<HTMLInputElement>('[data-setting="mode-soft"]')!;
  const modeFastInput = root.querySelector<HTMLInputElement>('[data-setting="mode-fast"]')!;
  renderIntervalMarkers(intervalsEl, getActiveSessionRuntime().intervals);
  updateSubtitle(root, settings);
  setSettingsEnabled(root, true);

  toggleButton.addEventListener("click", () => {
    void engine.toggle().then(() => updateButtonLabel());
  });

  stopButton.addEventListener("click", () => {
    engine.stop();
    updateButtonLabel();
    setSettingsEnabled(root, true);
  });

  durationInput.addEventListener("change", () => {
    applySettingsFromUi();
  });

  loopCheckbox.addEventListener("change", () => {
    applySettingsFromUi();
  });

  modeSoftInput.addEventListener("change", () => {
    if (modeSoftInput.checked) applySettingsFromUi();
  });

  modeFastInput.addEventListener("change", () => {
    if (modeFastInput.checked) applySettingsFromUi();
  });

  engine.setValuesListener((values) => {
    updateUi(values);
    updateButtonLabel(values.playbackState);
    setSettingsEnabled(root, values.playbackState === "stopped");
  });

  function applySettingsFromUi(): void {
    const nextSettings = readSettingsFromUi();
    if (!engine.setSessionSettings(nextSettings)) return;

    settings = nextSettings;
    renderIntervalMarkers(intervalsEl, getActiveSessionRuntime().intervals);
    updateSubtitle(root, settings);
    setText(root, "total", formatTime(settings.durationMinutes * 60));
    updateUi({
      playbackState: engine.getPlaybackState(),
      elapsed: 0,
      absoluteElapsed: 0,
      durationSeconds: settings.durationMinutes * 60,
      loop: settings.loop,
      rhythm: 0,
      carrier: 0,
      leftCarrier: 0,
      rightCarrier: 0,
      intervalId: getActiveSessionRuntime().intervals[0].id,
    });
  }

  function readSettingsFromUi(): SessionSettings {
    const mode: SessionMode = modeSoftInput.checked ? "soft" : "fast";
    return {
      durationMinutes: Number(durationInput.value),
      mode,
      loop: loopCheckbox.checked,
    };
  }

  function updateButtonLabel(state = engine.getPlaybackState()): void {
    toggleButton.textContent = state === "playing" ? "Pause" : "Play";
  }
}

function renderIntervalMarkers(container: HTMLElement, intervals: IntervalDefinition[]): void {
  container.replaceChildren();
  for (const interval of intervals) {
    const marker = document.createElement("span");
    marker.className = `player__interval player__interval--${interval.id}`;
    marker.style.flex = String(interval.segments);
    marker.title = interval.label;
    container.appendChild(marker);
  }
}

function updateSubtitle(root: HTMLElement, settings: SessionSettings): void {
  const modeLabel = getSessionModeDefinition(settings.mode).label;
  const loopLabel = settings.loop ? "зациклена" : "один проход";
  setText(root, "subtitle", `${settings.durationMinutes} мин · ${modeLabel} · ${loopLabel}`);
}

function setSettingsEnabled(root: HTMLElement, enabled: boolean): void {
  for (const input of root.querySelectorAll<HTMLInputElement>("[data-setting]")) {
    input.disabled = !enabled;
  }
}

function updateUi(values: LiveValues): void {
  if (!playerRoot) return;

  const intervals = getActiveSessionRuntime().intervals;
  const progressBase = values.loop ? values.elapsed : values.absoluteElapsed;
  const progress = values.durationSeconds > 0 ? progressBase / values.durationSeconds : 0;
  const phaseLabel = intervals.find((interval) => interval.id === values.intervalId)?.label ?? "—";

  setText(playerRoot, "elapsed", formatTime(progressBase));
  setText(playerRoot, "phase", phaseLabel);
  setText(playerRoot, "rhythm", `${values.rhythm.toFixed(2)} Hz`);
  setText(playerRoot, "carrier", `${values.carrier.toFixed(1)} Hz`);
  setText(playerRoot, "left", `${values.leftCarrier.toFixed(1)} Hz`);
  setText(playerRoot, "right", `${values.rightCarrier.toFixed(1)} Hz`);
  setText(playerRoot, "total", formatTime(values.durationSeconds));

  const progressEl = playerRoot.querySelector<HTMLDivElement>('[data-el="progress"]');
  if (progressEl) {
    progressEl.style.width = `${Math.min(100, progress * 100)}%`;
  }
}

function setText(root: HTMLElement, key: string, value: string): void {
  const el = root.querySelector(`[data-el="${key}"]`);
  if (el) el.textContent = value;
}
