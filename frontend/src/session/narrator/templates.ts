import type { IntervalDefinition } from "../intervals";
import type { SessionRuntime } from "../runtime";
import { getSessionMode } from "../settings";

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** [DD.MM.YYYY, HH:mm:ss] — локальное время клиента. */
export function formatTimestamp(date: Date = new Date()): string {
  const day = pad2(date.getDate());
  const month = pad2(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());
  return `[${day}.${month}.${year}, ${hours}:${minutes}:${seconds}]`;
}

function formatRhythm(rhythm: number): string {
  return Number(rhythm.toFixed(1)).toString();
}

function minutes(seconds: number): number {
  return Math.round(seconds / 60);
}

export function sessionStartPrompt(runtime: SessionRuntime): string {
  const { settings } = runtime;
  const modeLabel = getSessionMode(settings.mode).label;
  const loopLabel = settings.loop ? "с зацикливанием" : "без зацикливания";
  const phases = runtime.phaseDurations();

  return (
    `${formatTimestamp()} клиент инициировал сессию ${settings.durationMinutes} минут ` +
    `в режиме «${modeLabel} спуск», ${loopLabel}. Это значит погружение займёт ` +
    `${minutes(phases.descent)} минут, затем плато ${minutes(phases.plateau)} минут ` +
    `и подъём ${minutes(phases.ascent)} минут. Подготовь клиента к началу и завершению ` +
    `сессии аудиальных эффектов, настрой на спокойствие и доверие, ` +
    `попроси комфортно разместиться во времени и пространстве.`
  );
}

export function intervalEnterPrompt(interval: IntervalDefinition, rhythm: number): string {
  return (
    `${formatTimestamp()} клиент переходит в интервал «${interval.label}», ` +
    `ритм ${formatRhythm(rhythm)} Гц`
  );
}

export function intervalContinuePrompt(interval: IntervalDefinition, rhythm: number): string {
  return (
    `${formatTimestamp()} клиент продолжает находиться на интервале «${interval.label}», ` +
    `текущий ритм ${formatRhythm(rhythm)} Гц`
  );
}

export function sessionEndPrompt(): string {
  return `${formatTimestamp()} клиент завершил сессию, мягко закрепи полученный опыт и верни его в настоящее.`;
}
