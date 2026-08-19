import { API_BASE } from "../../config/api";

export interface TtsCue {
  timecode: string;
  text: string;
}

export interface SessionTimeline {
  sessionId: string;
  cues: TtsCue[];
  durationSeconds: number;
}

interface SessionStart {
  sessionId: string;
  status: string;
}

interface SessionSnapshot {
  sessionId: string;
  status: string;
  cues?: TtsCue[];
  durationSeconds?: number;
  error?: string;
}

const SESSION_FETCH_TIMEOUT_MS = 15 * 60 * 1000;
const POLL_INTERVAL_MS = 1000;
const SCENARIO_ERROR_STATUSES = new Set(["failed", "cancelled", "incomplete"]);

export async function createSession(userInput: string, signal?: AbortSignal): Promise<SessionTimeline> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SESSION_FETCH_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  let sessionId: string | undefined;

  try {
    const started = await postSession(userInput, controller.signal);
    sessionId = started.sessionId;

    while (true) {
      throwIfAborted(controller.signal);
      const snapshot = await getSession(sessionId, controller.signal);

      if (snapshot.status === "completed") {
        if (!Array.isArray(snapshot.cues) || typeof snapshot.durationSeconds !== "number") {
          throw new Error("Некорректный ответ GET /session при status=completed");
        }

        return {
          sessionId: snapshot.sessionId,
          cues: snapshot.cues,
          durationSeconds: snapshot.durationSeconds,
        };
      }

      if (SCENARIO_ERROR_STATUSES.has(snapshot.status)) {
        throw new Error(snapshot.error || scenarioErrorMessage(snapshot.status));
      }

      await sleep(POLL_INTERVAL_MS, controller.signal);
    }
  } catch (error) {
    if (sessionId) {
      void finalizeSession(sessionId);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function finalizeSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/session/${sessionId}`, { method: "DELETE" });
}

export async function fetchSynthesizedAudio(text: string, speed: number): Promise<ArrayBuffer> {
  const res = await fetch(`${API_BASE}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speed }),
  });

  if (!res.ok) throw new Error(await res.text());

  return res.arrayBuffer();
}

export function decodeNarratorBuffer(
  context: AudioContext,
  bytes: ArrayBuffer,
): Promise<AudioBuffer> {
  return context.decodeAudioData(bytes.slice(0));
}

export function timecodeToSeconds(timecode: string): number {
  const [hours, minutes, seconds] = timecode.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

async function postSession(userInput: string, signal: AbortSignal): Promise<SessionStart> {
  const res = await fetch(`${API_BASE}/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userInput }),
    signal,
  });

  if (!res.ok) throw new Error(await res.text());

  const data = (await res.json()) as SessionStart;
  if (!data.sessionId) {
    throw new Error("Некорректный ответ POST /session");
  }

  return data;
}

async function getSession(sessionId: string, signal: AbortSignal): Promise<SessionSnapshot> {
  const res = await fetch(`${API_BASE}/session/${sessionId}`, { signal });
  if (!res.ok) throw new Error(await res.text());
  return (await res.json()) as SessionSnapshot;
}

function scenarioErrorMessage(status: string): string {
  if (status === "cancelled") return "Генерация сценария отменена";
  if (status === "incomplete") return "Генерация сценария оборвалась до завершения";
  return "Не удалось получить сценарий";
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}
