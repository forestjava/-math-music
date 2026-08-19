export interface TtsCue {
  timecode: string;
  text: string;
}

export interface SessionScenario {
  sessionId: string;
  cues: TtsCue[];
  durationSeconds: number;
}

const TTS_HEADING = /(?:^|\n)\s*#{0,6}\s*TTS\s*(?:\n|$)/i;
const FENCE = /```(?:text)?\s*\n([\s\S]*?)\n```/;
const TIMECODE = /\[(\d{1,2}):(\d{2}):(\d{2})\]/g;

/** Вырезает тело fenced-блока TTS из сырого ответа агента. */
export function extractTtsFence(raw: string): string {
  const heading = TTS_HEADING.exec(raw);
  const searchFrom = heading ? heading.index + heading[0].length : 0;
  const slice = raw.slice(searchFrom);
  const fence = FENCE.exec(slice);
  if (!fence) {
    throw new Error("В ответе агента нет блока TTS ```text```");
  }
  return fence[1].trim();
}

export function parseTtsCues(body: string): TtsCue[] {
  const matches = [...body.matchAll(TIMECODE)];
  if (matches.length === 0) {
    throw new Error("В блоке TTS нет таймкодов [hh:mm:ss]");
  }

  const cues: TtsCue[] = [];
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const start = match.index ?? 0;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? body.length) : body.length;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    const seconds = Number(match[3]);
    if (minutes > 59 || seconds > 59) {
      throw new Error(`Некорректный таймкод ${match[0]}`);
    }

    const text = body.slice(start + match[0].length, end).trim();
    if (!text) {
      throw new Error(`Пустой текст после таймкода ${match[0]}`);
    }

    cues.push({
      timecode: formatTimecode(hours, minutes, seconds),
      text,
    });
  }

  return cues;
}

export function parseSessionScenario(sessionId: string, raw: string): SessionScenario {
  const cues = parseTtsCues(extractTtsFence(raw));
  const last = cues[cues.length - 1];
  return {
    sessionId,
    cues,
    durationSeconds: timecodeToSeconds(last.timecode),
  };
}

export function timecodeToSeconds(timecode: string): number {
  const [hours, minutes, seconds] = timecode.split(":").map(Number);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatTimecode(hours: number, minutes: number, seconds: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
