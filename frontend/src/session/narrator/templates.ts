import type { Interval, IntervalDefinition } from "../intervals";
import type { SessionRuntime } from "../runtime";
import { getSessionMode } from "../settings";

/** DD.MM.YYYY, HH:mm:ss — локальное время клиента. */
export function formatTimestamp(date: Date = new Date()): string {
  return date.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** HH:mm:ss — локальное время клиента. */
export function formatTime(date: Date = new Date()): string {
  return date.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function minutes(seconds: number): number {
  return Math.round(seconds / 60);
}

const PHRASES_PER_MINUTE_MIN = 1.5;
const PHRASES_PER_MINUTE_MAX = 1.9;
// за 25 минут - 46 запросов, за час - 163 запроса -- TODO пересмотреть
function estimatePhraseRange(durationMinutes: number): { min: number; max: number } {
  return {
    min: Math.round(PHRASES_PER_MINUTE_MIN * durationMinutes),
    max: Math.round(PHRASES_PER_MINUTE_MAX * durationMinutes),
  };
}

const ENTER_INSTRUCTIONS: Record<Interval, string> = {
  betaDescent:
    "Продолжай уже начатую линию. " +
    "Для вариативности ориентируйся на запрос " +
    "\"monomyth call to adventure examples\". " +
    "Возьми оттуда один конкретный мотив входа в путь и преврати его в чувственно явленную сцену.",

  alphaDescent:
    "Продолжай уже начатую линию. " +
    "Для вариативности ориентируйся на запрос " +
    "\"monomyth crossing the threshold examples\". " +
    "Возьми оттуда один конкретный мотив перехода границы и углуби через пространство, ориентир, проход или смену среды.",

  thetaDescent:
    "Продолжай уже начатую линию. " +
    "Для вариативности ориентируйся на запрос " +
    "\"monomyth belly of the whale examples\". " +
    "Возьми оттуда один конкретный мотив необратимого погружения, изоляции, тайны или внутреннего захвата.",

  deltaDescent:
    "Продолжай уже начатую линию. " +
    "Для вариативности ориентируйся на запрос " +
    "\"monomyth road of trials examples\". " +
    "Возьми оттуда один конкретный мотив испытания, встречи, запрета, проверки, обмена, жертвы или столкновения и свяжи его в сюжетный узел.",

  deltaPlateau:
    "Продолжай уже начатую линию. " +
    "Для вариативности ориентируйся на запрос " +
    "\"monomyth apotheosis examples\". " +
    "Возьми оттуда один конкретный мотив кульминационного преображения, высшего видения, выбора или перелома.",

  deltaAscent:
    "Продолжай уже начатую линию. " +
    "Для вариативности ориентируйся на запрос " +
    "\"monomyth ultimate boon examples\". " +
    "Возьми оттуда один конкретный мотив дара, ответа, знания, артефакта, освобождения или цены победы.",

  thetaAscent:
    "Продолжай уже начатую линию. " +
    "Для вариативности ориентируйся на запрос " +
    "\"monomyth refusal of the return magic flight examples\". " +
    "Возьми оттуда один конкретный мотив обратного пути, выноса дара, преследования, убывающего напряжения или трудного выхода.",

  alphaAscent:
    "Продолжай уже начатую линию. " +
    "Для вариативности ориентируйся на запрос " +
    "\"monomyth crossing the return threshold examples\". " +
    "Возьми оттуда один конкретный мотив возвращения в знакомый мир и завершения дуги возвращения.",

  betaAscent:
    "Продолжай уже начатую линию. " +
    "Для вариативности ориентируйся на запрос " +
    "\"monomyth master of two worlds freedom to live examples\". " +
    "Возьми оттуда один конкретный мотив интеграции, завершённости, телесного возвращения и окончательного выхода.",
};

export function sessionStartPrompt(runtime: SessionRuntime): string {
  const { settings } = runtime;
  const modeLabel = getSessionMode(settings.mode).label;
  const loopLabel = settings.loop ? "с зацикливанием" : "без зацикливания";
  const phases = runtime.phaseDurations();
  const { min: phraseMin, max: phraseMax } = estimatePhraseRange(settings.durationMinutes);

  return (
    `[${formatTimestamp()}] клиент инициировал сессию длительностью ${settings.durationMinutes} минут ` +
    `в режиме «${modeLabel} спуск», ${loopLabel}. Это значит погружение займёт ` +
    `${minutes(phases.descent)} минут, затем дельта-волновая кульминация ${minutes(phases.plateau)} минут ` +
    `и подъём ${minutes(phases.ascent)} минут. ` +
    `За это время от тебя будет запрошено ` +
    `примерно ${phraseMin}..${phraseMax} фраз, каждая не более сотни символов. ` +
    `Найди скрытую рамку истории как вариацию кэмпбелловского мономифа ` +
    `(departure → initiation → return), но не раскрывай её клиенту сейчас. ` +
    // departure → initiation → return Кэмпбеооа - это и есть спуск → плато → подъём ритмов -- TODO
    `Дальше на каждом этапе сохраняй связность уже идущей истории и, когда нужно уточнить следующий ход, ` +
    `ориентируйся на соответствующий термин monomyth / hero's journey, извлекая оттуда ` +
    `теорию и конкретные мифологические, религиозные, эпические, ритуальные, эротические и образные мотивы. ` +
    `Пока кратко подготовь клиента к началу сессии аудиальных эффектов, ` +
    `лаконично попроси комфортно разместиться во времени и пространстве.`
  );
}

export function intervalEnterPrompt(interval: IntervalDefinition): string {
  return (
    `[${formatTime()}] клиент перешёл в интервал «${interval.label}». ` +
    ENTER_INSTRUCTIONS[interval.id]
  );
}

export function intervalContinuePrompt(interval: IntervalDefinition): string {
  return (
    `[${formatTime()}] клиент продолжает интервал «${interval.label}». ` +
    `Продолжай уже начатую линию, сохраняй связность, ` +
    `добавь ещё один новый содержательный элемент или следующий естественный сюжетный ход.`
  );
}

export function sessionEndPrompt(): string {
  return `[${formatTime()}] клиент завершил сессию, закрепи полученный опыт и мягко верни его в настоящее.`;
}
