// v1 API; pitch_shift — только в v3 (https://aistudio.yandex.ru/docs/ru/speechkit/tts-v3/)
const YANDEX_TTS_URL =
  process.env.YANDEX_TTS_URL ?? "https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize";

const LANG = "ru-RU";
const VOICE = "ermil";
const EMOTION = "neutral";
const FORMAT = "oggopus";

export interface SynthesizeParams {
  text: string;
  speed: number;
}

export interface SynthesizeResult {
  buffer: Buffer;
  contentType: string;
}

export async function synthesize(params: SynthesizeParams): Promise<SynthesizeResult> {
  const apiKey = process.env.TTS_API_KEY;
  if (!apiKey) {
    throw new Error("TTS_API_KEY не задан");
  }

  const body = new URLSearchParams({
    text: params.text,
    lang: LANG,
    voice: VOICE,
    emotion: EMOTION,
    speed: String(params.speed),
    format: FORMAT,
  });

  const res = await fetch(YANDEX_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Api-Key ${apiKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    const message = await res.text();
    throw new Error(message || `Yandex TTS error: ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const contentType = res.headers.get("content-type") ?? "audio/ogg";

  return {
    buffer: Buffer.from(arrayBuffer),
    contentType,
  };
}
