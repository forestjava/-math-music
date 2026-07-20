export interface ApophasisHit {
  match: string;
  x: string;
  y: string;
}

const WORD = String.raw`[A-Za-zА-Яа-яЁё\-]+`;
/** Граница: не буква/дефис слева (для кириллицы `\b` ненадёжен). */
const LEFT = String.raw`(?<![A-Za-zА-Яа-яЁё\-])`;

const PATTERNS: RegExp[] = [
  new RegExp(`${LEFT}не\\s+(?<x>${WORD})\\s*,\\s*а\\s+(?<y>${WORD})`, "gi"),
  new RegExp(`${LEFT}не\\s+(?<x>${WORD})\\s*,\\s*но\\s+(?<y>${WORD})`, "gi"),
  new RegExp(`${LEFT}(?<y>${WORD})\\s*,\\s*но\\s+не\\s+(?<x>${WORD})`, "gi"),
  new RegExp(`${LEFT}(?<y>${WORD})\\s*,\\s*а\\s+не\\s+(?<x>${WORD})`, "gi"),
];

/** Все вхождения однословной апофатики: «не X, а/но Y» или «Y, а/но не X». */
export function detectApophasis(speech: string): ApophasisHit[] {
  const normalized = speech.replace(/\s+/g, " ").trim();
  const hits: ApophasisHit[] = [];
  const seen = new Set<string>();

  for (const pattern of PATTERNS) {
    pattern.lastIndex = 0;
    for (const m of normalized.matchAll(pattern)) {
      const x = m.groups?.x;
      const y = m.groups?.y;
      if (!x || !y || m.index === undefined) continue;
      const match = m[0]!.trim();
      const key = `${m.index}:${match.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      hits.push({ match, x, y });
    }
  }

  return hits;
}

export function buildApophasisRetryPrompt(hits: ApophasisHit[]): string {
  const list = hits
    .map((h) => `«${h.match}» (не X=${h.x}, но Y=${h.y})`)
    .join("; ");
  const preferY = [...new Set(hits.map((h) => h.y))].map((y) => `«${y}»`).join(", ");
  return (
    `Возможно, speech содержит апофатику: ${list}. ` +
    `Убери, если это только для отрицательного контраста, опиши просто напрямую через Y (${preferY}). `
  );
}
