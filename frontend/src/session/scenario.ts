import { API_BASE } from "../config/api";

export interface TtsCue {
  timecode: string;
  text: string;
}

export interface SessionScenario {
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
  agentOutput?: string;
}

const SESSION_FETCH_TIMEOUT_MS = 15 * 60 * 1000;
const POLL_INTERVAL_MS = 5000;
const SCENARIO_ERROR_STATUSES = new Set(["failed", "cancelled", "incomplete"]);

export class ScenarioError extends Error {
  readonly agentOutput?: string;

  constructor(message: string, agentOutput?: string) {
    super(message);
    this.name = "ScenarioError";
    this.agentOutput = agentOutput;
  }
}

export type ScenarioProgressEvent =
  | { phase: "request" }
  | { phase: "accepted"; sessionId: string; status: string }
  | { phase: "check"; status: string }
  | { phase: "check-retry" }
  | { phase: "ready"; cueCount: number; durationSeconds: number };

/** Стартует генерацию на бэкенде и ждёт completed (опрос раз в 5 с). */
export async function waitForScenario(
  userInput: string,
  signal?: AbortSignal,
  onProgress?: (event: ScenarioProgressEvent) => void,
): Promise<SessionScenario> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SESSION_FETCH_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  let sessionId: string | undefined;

  try {
    onProgress?.({ phase: "request" });
    const started = await postSession(userInput, controller.signal);
    sessionId = started.sessionId;
    onProgress?.({ phase: "accepted", sessionId: started.sessionId, status: started.status });

    while (true) {
      throwIfAborted(controller.signal);
      const snapshot = await pollSession(sessionId, controller.signal);

      if (!snapshot) {
        onProgress?.({ phase: "check-retry" });
        await sleep(POLL_INTERVAL_MS, controller.signal);
        continue;
      }

      if (snapshot.status === "completed") {
        if (!Array.isArray(snapshot.cues) || typeof snapshot.durationSeconds !== "number") {
          throw new Error("Некорректный ответ GET /session при status=completed");
        }

        onProgress?.({
          phase: "ready",
          cueCount: snapshot.cues.length,
          durationSeconds: snapshot.durationSeconds,
        });

        return {
          sessionId: snapshot.sessionId,
          cues: snapshot.cues,
          durationSeconds: snapshot.durationSeconds,
        };
      }

      if (SCENARIO_ERROR_STATUSES.has(snapshot.status)) {
        throw new ScenarioError(
          snapshot.error || scenarioErrorMessage(snapshot.status),
          snapshot.agentOutput,
        );
      }

      onProgress?.({ phase: "check", status: snapshot.status });
      await sleep(POLL_INTERVAL_MS, controller.signal);
    }
  } catch (error) {
    if (sessionId) {
      void abandonScenario(sessionId);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

export async function abandonScenario(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/session/${sessionId}`, { method: "DELETE" });
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

/** Успешный снимок или null, если это сбой проверки и нужно повторить с тем же session id. */
async function pollSession(
  sessionId: string,
  signal: AbortSignal,
): Promise<SessionSnapshot | null> {
  try {
    const res = await fetch(`${API_BASE}/session/${sessionId}`, { signal });
    if (res.status === 404) {
      throw new Error("session not found");
    }
    if (!res.ok) {
      console.warn(`[session ${sessionId}] сбой проверки статуса (${res.status}), повтор`);
      return null;
    }
    return (await res.json()) as SessionSnapshot;
  } catch (error) {
    if (signal.aborted || isAbortError(error)) throw error;
    if (error instanceof Error && error.message === "session not found") throw error;
    console.warn(`[session ${sessionId}] сбой проверки статуса, повтор`, error);
    return null;
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
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
