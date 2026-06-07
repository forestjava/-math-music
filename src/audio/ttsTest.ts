const TTS_API_KEY = import.meta.env.VITE_TTS_API_KEY;
const TTS_SYNTHESIZE_URL = import.meta.env.VITE_TTS_SYNTHESIZE_URL;

export async function speak(text: string): Promise<AudioBufferSourceNode> {
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (!import.meta.env.DEV) {
    if (!TTS_API_KEY) {
      throw new Error("VITE_TTS_API_KEY не задан в .env");
    }
    headers.Authorization = `Api-Key ${TTS_API_KEY}`;
  }

  const res = await fetch(TTS_SYNTHESIZE_URL, {
    method: "POST",
    headers,
    body: new URLSearchParams({
      text,
      lang: "ru-RU",
      voice: "ermil",
      emotion: "neutral",
      speed: "0.75",
      format: "oggopus",
    }),
  });

  if (!res.ok) throw new Error(await res.text());

  const compressed = await res.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(compressed.slice(0));

  const source = new AudioBufferSourceNode(audioContext, { buffer: audioBuffer });
  source.connect(audioContext.destination);
  source.start();

  return source;
}
