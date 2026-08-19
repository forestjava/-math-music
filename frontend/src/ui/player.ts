import {
  BinauralSessionEngine,
  formatTime,
  type LiveValues,
} from "../audio/binauralEngine";
import { getActiveSessionRuntime } from "../session/activeRuntime";
import type { IntervalDefinition } from "../session/intervals";
import {
  DEFAULT_SESSION_SETTINGS,
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
          <span class="player__field-label">User Input</span>
          <textarea
            class="player__textarea"
            data-setting="user-input"
            rows="4"
          >${settings.userInput}</textarea>
        </label>
        <label class="player__field player__field--checkbox">
          <input type="checkbox" class="player__checkbox" data-setting="loop" />
          <span>Зациклить</span>
        </label>
      </section>
      <p class="player__error" data-el="error" hidden></p>
      <div class="player__controls">
        <button type="button" class="player__button" data-action="toggle">Play</button>
        <button type="button" class="player__button player__button--secondary" data-action="stop">Stop</button>
      </div>
      <section class="player__timeline">
        <div class="player__time-row">
          <span data-el="elapsed">00:00</span>
          <span data-el="phase">—</span>
          <span data-el="total">—</span>
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
  const loopCheckbox = root.querySelector<HTMLInputElement>('[data-setting="loop"]')!;
  const userInputField = root.querySelector<HTMLTextAreaElement>('[data-setting="user-input"]')!;
  renderIntervalMarkers(intervalsEl, getActiveSessionRuntime().intervals);
  updateSubtitle(root, settings, 0);
  setSettingsEnabled(root, true);

  toggleButton.addEventListener("click", () => {
    applySettingsFromUi();
    void engine.toggle().then(() => updateButtonLabel());
  });

  stopButton.addEventListener("click", () => {
    engine.stop();
    updateButtonLabel();
    setSettingsEnabled(root, true);
  });

  loopCheckbox.addEventListener("change", () => {
    applySettingsFromUi();
  });

  userInputField.addEventListener("change", () => {
    applySettingsFromUi();
  });

  engine.setValuesListener((values) => {
    updateUi(values);
    updateButtonLabel(values.playbackState);
    setSettingsEnabled(root, values.playbackState === "stopped");
    toggleButton.disabled = values.playbackState === "preparing";
  });

  function applySettingsFromUi(): void {
    const nextSettings = readSettingsFromUi();
    if (!engine.setSessionSettings(nextSettings)) return;

    settings = nextSettings;
    updateSubtitle(root, settings, engine.getSessionRuntime().durationSeconds);
  }

  function readSettingsFromUi(): SessionSettings {
    return {
      loop: loopCheckbox.checked,
      userInput: userInputField.value,
    };
  }

  function updateButtonLabel(state = engine.getPlaybackState()): void {
    if (state === "preparing") {
      toggleButton.textContent = "pending scenario";
      return;
    }
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

function updateSubtitle(root: HTMLElement, settings: SessionSettings, durationSeconds: number): void {
  const loopLabel = settings.loop ? "зациклена" : "один проход";
  const durationLabel = durationSeconds > 0 ? formatTime(durationSeconds) : "—";
  setText(root, "subtitle", `${durationLabel} · ${loopLabel}`);
}

function setSettingsEnabled(root: HTMLElement, enabled: boolean): void {
  for (const input of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("[data-setting]")) {
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
  setText(playerRoot, "rhythm", values.rhythm ? `${values.rhythm.toFixed(2)} Hz` : "—");
  setText(playerRoot, "carrier", values.carrier ? `${values.carrier.toFixed(1)} Hz` : "—");
  setText(playerRoot, "left", values.leftCarrier ? `${values.leftCarrier.toFixed(1)} Hz` : "—");
  setText(playerRoot, "right", values.rightCarrier ? `${values.rightCarrier.toFixed(1)} Hz` : "—");
  setText(playerRoot, "total", values.durationSeconds > 0 ? formatTime(values.durationSeconds) : "—");
  updateSubtitle(playerRoot, { loop: values.loop, userInput: "" }, values.durationSeconds);

  const errorEl = playerRoot.querySelector<HTMLElement>('[data-el="error"]');
  if (errorEl) {
    errorEl.hidden = !values.error;
    errorEl.textContent = values.error ?? "";
  }

  const progressEl = playerRoot.querySelector<HTMLDivElement>('[data-el="progress"]');
  if (progressEl) {
    progressEl.style.width = `${Math.min(100, progress * 100)}%`;
  }
}

function setText(root: HTMLElement, key: string, value: string): void {
  const el = root.querySelector(`[data-el="${key}"]`);
  if (el) el.textContent = value;
}
