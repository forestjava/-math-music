import type { IntervalDefinition, SessionAct } from "../intervals";
import type { SessionRuntime } from "../runtime";
import { buildStageStretchContinuePrompt } from "./stageStretch";

const ACT_LABELS: Record<SessionAct, string> = {
  setup: "Act I setup",
  confrontation: "Act II confrontation",
  resolution: "Act III resolution",
};

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

function formatActIntervalSchedule(runtime: SessionRuntime, act: SessionAct): string {
  const lines: string[] = [];
  for (let i = 0; i < runtime.intervals.length; i++) {
    const interval = runtime.intervals[i];
    if (interval.act !== act) continue;
    lines.push(
      `  ${formatElapsed(runtime.intervalStartElapsed(i))} «${interval.id}» ${interval.meaning}`,
    );
  }
  return lines.join("\n");
}

export function sessionStartPrompt(runtime: SessionRuntime): string {
  const { settings } = runtime;
  const actIIStart = runtime.actStartElapsed("confrontation");
  const actIIIStart = runtime.actStartElapsed("resolution");

  //const accent = "об агентных паттернах и мемо-репликаторах, обитающих в логоструктурном морфопространстве, о децентрализованных или распределенных системах принятия решений, о роевом управлении";

  return (
    `Клиент инициировал сессию длительностью ${settings.durationMinutes} минут. ` +

    `В заметках распланируй сюжетную линию и структуру нарратива ` +
    `как three-act structure (трёхактная структура, декомпозируемая на 12 стадий по Воглеру ` +
    `или на 17 stages of the journey по Кэмпбеллу). ` +

    // `Кратко наметь сеттинг ${accent}, способ реализации структуры нарратива в нём,
    // исходные место и время,
    // внутренние и внешние цели,
    // формы проявления конкретных деталей мира, основных и второстепенных персонажей,
    // развития событий, действий...\n` +
    
    `Не выкладывай сразу всю арку. ` +
    `Тайминг трёх актов:\n` +
    `  ${formatElapsed(0)} Act I «setup» (экспозиция, завязка; separation / departure)\n` +
    `  ${formatElapsed(actIIStart)} Act II «confrontation» (rising action, столкновение; initiation)\n` +
    `  ${formatElapsed(actIIIStart)} Act III «resolution» (climax & denouement, развязка; return)\n` +

    `В блоке озвучания {...} подготовь клиента к началу сессии аудиальных эффектов, ` +
    `лаконично попроси комфортно разместиться телом и вниманием во времени и пространстве.`
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
    prompt += `${ACT_LABELS[interval.act]}.\n`;
    prompt += `Тайминг трёх следующих стадий внутри акта «${ACT_LABELS[interval.act]}»: \n${formatActIntervalSchedule(runtime, interval.act)} \n\n`;
  }

  prompt +=
    `[${formatElapsed(elapsed)}] клиент переходит в стадию «${interval.id}».\n` +
    `Смысл: ${interval.meaning} \n` +
    `По Воглеру: ${interval.voglerStages} \n` +
    `По Кэмпбеллу: ${interval.campbellStages} \n` +
    `Найди в интернете частный пример проявления стадии «${interval.label}», используй его как основу, ` +
    `воплоти структуру стадии в текущем сеттинге, начни рассказывать конкретную сцену, ` +
    `в первом озвучиваемом блоке данной стадии выдай снова первые 2-4 небольшие фразы поворота истории`;

  return prompt;
}

export function intervalContinuePrompt(
  elapsed: number,
  interval: IntervalDefinition,
  phraseIndex: number,
): string {
  return (
    `[${formatElapsed(elapsed)}] клиент продолжает «${interval.id}».\n` +
    buildStageStretchContinuePrompt(phraseIndex)
  );
}

export function sessionEndPrompt(elapsed: number): string {
  return (
    `[${formatElapsed(elapsed)}] клиент завершил сессию.\n` +
    `Выведи последний блок для клиента — закрепи полученный опыт и мягко верни его в настоящее.`
  );
}
