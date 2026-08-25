import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import {
  cancelBackgroundScenario,
  isTerminalStatus,
  retrieveBackgroundScenario,
  startBackgroundScenario,
  type RetrievedRun,
} from "./agentClient.js";
import { parseSessionScenario, type TtsCue } from "./parseTts.js";
import { loadTimelinePrompt } from "./prompt.js";
import {
  deleteSessionRecord,
  getSessionRecord,
  saveSessionRecord,
  type SessionRecord,
} from "./sessionStore.js";

const announcedLogFiles = new Set<string>();

export interface SessionStart {
  sessionId: string;
  status: string;
}

export interface SessionSnapshot {
  sessionId: string;
  status: string;
  cues?: TtsCue[];
  durationSeconds?: number;
  error?: string;
  /** Сырой ответ агента — только если не удалось найти блок TTS. */
  agentOutput?: string;
}

export async function startSession(userInput: string): Promise<SessionStart> {
  const sessionId = globalThis.crypto.randomUUID();
  const instructions = loadTimelinePrompt();
  const run = await startBackgroundScenario(instructions, userInput);

  saveSessionRecord({
    sessionId,
    perplexityResponseId: run.id,
    status: run.status,
  });

  return { sessionId, status: run.status };
}

/** Проксирует GET Perplexity по сохранённому response id и кэширует готовый сценарий. */
export async function refreshSession(sessionId: string): Promise<SessionSnapshot | null> {
  const record = getSessionRecord(sessionId);
  if (!record) return null;

  if (record.scenario) {
    return toSnapshot(record);
  }

  if (isTerminalStatus(record.status) && record.status !== "completed") {
    return toSnapshot(record);
  }

  let run: RetrievedRun;
  try {
    run = await retrieveBackgroundScenario(record.perplexityResponseId);
  } catch (error) {
    console.warn(
      `[session ${sessionId}] сбой проверки статуса, задание не отменяем:`,
      error instanceof Error ? error.message : error,
    );
    return toSnapshot(record);
  }

  record.status = run.status;

  if (run.status === "completed") {
    if (!run.outputText) {
      record.status = "failed";
      record.error = "Agent API вернул пустой ответ";
      saveSessionRecord(record);
      return toSnapshot(record);
    }

    try {
      logTimelineExchange(sessionId, run.outputText);
      record.scenario = parseSessionScenario(sessionId, run.outputText);
      record.error = undefined;
      record.agentOutput = undefined;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Не удалось разобрать сценарий";
      record.status = "failed";
      record.error = message;
      if (message.includes("нет блока TTS")) {
        record.agentOutput = run.outputText;
      } else {
        record.agentOutput = undefined;
      }
    }

    saveSessionRecord(record);
    return toSnapshot(record);
  }

  if (run.status === "failed" || run.status === "cancelled" || run.status === "incomplete") {
    record.error =
      run.errorMessage ??
      (run.status === "cancelled"
        ? "Генерация сценария отменена"
        : run.status === "incomplete"
          ? "Генерация сценария оборвалась до завершения"
          : "Генерация сценария завершилась с ошибкой");
    saveSessionRecord(record);
    return toSnapshot(record);
  }

  saveSessionRecord(record);
  return toSnapshot(record);
}

export async function abandonSession(sessionId: string): Promise<void> {
  const record = deleteSessionRecord(sessionId);
  if (!record || isTerminalStatus(record.status)) return;

  await cancelBackgroundScenario(record.perplexityResponseId);
}

function toSnapshot(record: SessionRecord): SessionSnapshot {
  if (record.scenario && record.status === "completed") {
    return {
      sessionId: record.sessionId,
      status: record.status,
      cues: record.scenario.cues,
      durationSeconds: record.scenario.durationSeconds,
    };
  }

  return {
    sessionId: record.sessionId,
    status: record.status,
    error: record.error,
    agentOutput: record.agentOutput,
  };
}

function isTimelineLogEnabled(): boolean {
  const value = process.env.TIMELINE_LOG?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "yes";
}

function timelineLogPath(sessionId: string): string {
  const dir = join(process.cwd(), "logs");
  mkdirSync(dir, { recursive: true });
  return join(dir, `timeline-${sessionId}.log`);
}

function logTimelineExchange(sessionId: string, raw: string): void {
  if (!isTimelineLogEnabled()) return;

  const logPath = timelineLogPath(sessionId);
  const border = "=".repeat(72);
  const rule = "-".repeat(72);

  const block = [
    "",
    border,
    `[timeline] сессия ${sessionId}`,
    rule,
    "ASSISTANT:",
    raw,
    border,
    "",
  ].join("\n");

  appendFileSync(logPath, block, "utf8");

  if (!announcedLogFiles.has(logPath)) {
    announcedLogFiles.add(logPath);
    console.log(`[timeline] лог сессии: ${logPath}`);
  }
}
