export interface BannedLabelHit {
  match: string;
  label: string;
}

const LEFT = String.raw`(?<![A-Za-zА-Яа-яЁё\-])`;
const RIGHT = String.raw`(?![A-Za-zА-Яа-яЁё\-])`;

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Все прямые вхождения фраз из списка (каждое совпадение). */
function detectAllPhrases(speech: string, phrases: string[]): BannedLabelHit[] {
  const normalized = speech.replace(/\s+/g, " ").trim();
  const sorted = [...phrases].sort((a, b) => b.length - a.length);
  const hits: { index: number; hit: BannedLabelHit }[] = [];
  const seen = new Set<string>();

  for (const label of sorted) {
    const body = label.split(/\s+/).map(escapeRegExp).join(String.raw`\s+`);
    const pattern = new RegExp(`${LEFT}${body}${RIGHT}`, "gi");
    for (const m of normalized.matchAll(pattern)) {
      if (m.index === undefined) continue;
      const match = m[0]!;
      const key = `${m.index}:${match.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ index: m.index, hit: { match, label } });
    }
  }

  return hits.sort((a, b) => a.index - b.index).map((x) => x.hit);
}

/** Архетипы / абстрактные ярлыки (SYSTEM.DAP ~строка 56). */
const BANNED_LABELS = [
  "герой",
  "имя", "имени", "имени", "именем", "имени",
  "как тебя звали",
  "старая форма", "новая форма", "менять форму",
  "старая одежда", "новая одежда", "менять одежду",
  "фигура", "фигуры", "фигуре", "фигуру", "фигурой", "фигуре",
  "фигурка", "фигурки", "фигурке", "фигурку", "фигуркой", "фигурке",
  "силуэт",
  "плащ", "плаща", "плащу", "плащом", "плаще",
  "незнакомец", "незнакомца", "незнакомцу", "незнакомцем", "незнакомце",
  "незнакомка", "незнакомки", "незнакомке", "незнакомку", "незнакомкой", "незнакомке", 
  "проводник", "проводника", "проводнику", "проводником", "проводнике",
  "зов",
  "звон",
  "ключ",
  "фонарь", "фонарик",
  "свет", "света", "свету", "светом", "свете",
  "тьма",
  "начинает тускнеть",
  "знак",
  "символ",
  "путь",
  "тень",
  "мать",
  "отец",
  "существо", "существа", "существу", "существом", "существе",
  "предмет", "предмета", "предмету", "предметом", "предмете",
  "нечто",
  "некий", "некая", "некое",
  "какой-то", "какая-то", "какое-то",
  "кто-то", "что-то",
  "кого-то", "чего-то",
  "кому-то", "чему-то",
  "кем-то", "чем-то", 
  "ком-то", "чём-то",
  "где-то",
  "когда-то", 
  "испытание",
  "дар",
  "эликсир",
];

/** Служебная мета-лексика сеанса (SYSTEM.DAP ~строка 54). */
const BANNED_META_TERMS = [
  "паттерн",
  "репликатор",
  "архетип",
  "акт",
  "стадия",
  "персонаж",
  "интервал",
  "бинауральный",
  "ритм",
  "бинауральные ритмы",
  "два тона",
  "частота",
  "сессия",
  "сеанс",
  "состояние",
  "сознание",
  "идентичность",
  "клиент", "клиента", "клиенту", "клиентом", "клиенте",
];

/** Все прямые вхождения запрещённых ярлыков/клише в speech. */
export function detectBannedLabel(speech: string): BannedLabelHit[] {
  return detectAllPhrases(speech, BANNED_LABELS);
}

export function buildBannedLabelRetryPrompt(hits: BannedLabelHit[]): string {
  const list = hits.map((h) => `«${h.match}»`).join("; ");
  return (
    `speech содержит прямое использование слишком абстрактных ярлыков/клише: ${list}. ` +
    `Переводи их на язык внутренней вселенной: конкретные персонажи, воплощенные в конкретных месте и времени, предметах, действиях, событиях. ` // согласно строке 56 системного промпта
  );
}

/** Все прямые вхождения запрещённых мета-терминов сеанса в speech. */
export function detectBannedMetaTerm(speech: string): BannedLabelHit[] {
  return detectAllPhrases(speech, BANNED_META_TERMS);
}

export function buildBannedMetaRetryPrompt(hits: BannedLabelHit[]): string {
  const list = hits.map((h) => `«${h.match}»`).join("; ");
  return (
    `speech содержит прямые упоминания служебных терминов: ${list}. ` +
    `Оставайся строго внутри «игрового мира». ` // согласно строке 54 системного промпта
  );
}
