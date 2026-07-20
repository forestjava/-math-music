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
  "старое имя",
  "новое имя",
  "как тебя звали",
  "забыл твоё имя",
  "старая одежда тает",
  "старая форма растворяется",
  "фигура", "фигуры", "фигуре", "фигуру", "фигурой", "фигуре",
  "плащ", "плаща", "плащу", "плащом", "плаще",
  "незнакомец", "незнакомца", "незнакомцу", "незнакомцем", "незнакомце",
  "незнакомка", "незнакомки", "незнакомке", "незнакомку", "незнакомкой", "незнакомке", 
  "зов",
  "звон",
  "ключ",
  "фонарь",
  "свет",
  "линия света",
  "нить света",
  "полоса света",
  "полоска света",
  "тьма",
  "знак",
  "символ",
  "путь",
  "тень",
  "мать",
  "отец",
  "существо",
  "предмет",
  "нечто",
  "некий",
  "некая",
  "некое",
  "какой-то",
  "какая-то",
  "какое-то",
  "что-то",
  "кто-то",
  "кого-то",
  "чего-то",
  "когда-то",
  "чему-то",
  "кому-то",
  "кем-то",
  "чем-то",
  "о ком-то",
  "о чем-то",
  "где-то",
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
  "клиент",
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
