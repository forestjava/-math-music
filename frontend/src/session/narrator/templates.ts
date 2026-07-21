import type { IntervalDefinition } from "../intervals";
import type { SessionRuntime } from "../runtime";

/** hh:mm:ss — прошедшее время от старта сессии. */
export function formatElapsed(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

function isFirstIntervalInAct(runtime: SessionRuntime, intervalIndex: number): boolean {
  if (intervalIndex === 0) return true;
  return runtime.intervals[intervalIndex].act !== runtime.intervals[intervalIndex - 1].act;
}

export function sessionStartPrompt(runtime: SessionRuntime): string {
  const { settings } = runtime;

  return (
    `Клиент инициировал сессию длительностью ${settings.durationMinutes} минут. ` +
    `` + // TODO user request
    `Инициализируй пустую сцену, а в speech только подготовь клиента — ` +
    `просто кратко попроси комфортно разместиться телом и вниманием во времени и пространстве.`
  );
}

export function intervalEnterPrompt(
  runtime: SessionRuntime,
  elapsed: number,
  interval: IntervalDefinition,
  intervalIndex: number,
): string {
  let prompt = "";

  if (isFirstIntervalInAct(runtime, intervalIndex)) {
    prompt += `Act ${interval.act}.\n`;
  }

  prompt +=
    `[${formatElapsed(elapsed)}] клиент переходит в стадию «${interval.id}».\n` +
    `Смысл стадии: ${interval.meaning} \n` +
    `По Воглеру: ${interval.voglerStages} \n` +
    `По Кэмпбеллу: ${interval.campbellStages} \n` +
    `Следуй системной инструкции: новый шаг — новый сюжетный поворот; ` +
    `воплоти новую сцену для стадии «${interval.label}»; ` +
    `в speech — 2–4 короткие фразы поворота.`;

  return prompt;
}

export function intervalContinuePrompt(
  elapsed: number,
  interval: IntervalDefinition,
): string {
  return (
    `[${formatElapsed(elapsed)}] (клиент продолжает стадию «${interval.id}»)\n` +
    `Следуй системной инструкции: новый шаг — новая сцена. ` + 
    `Находи разнообразные приёмы удержания внимания слушателя, качественного сторителлинга и сценарного мастерства — и сразу воплощай найденное в новой сцене. ` +
    `Запрещено повторять ранее озвученные реплики и их близкие парафразы. ` // согласно строке 14 системного промпта
  );
}

export function sessionEndPrompt(elapsed: number): string {
  return (
    `[${formatElapsed(elapsed)}] клиент завершил сессию.\n` +
    `В speech — последний блок: кратко закрепи полученный опыт и мягко верни в настоящее.`
  );
}
