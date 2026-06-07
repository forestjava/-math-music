import { API_BASE } from "../config/api";

const DEFAULT_SPEED = 0.75;

export async function speak(text: string): Promise<AudioBufferSourceNode> {
  const res = await fetch(`${API_BASE}/synthesize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, speed: DEFAULT_SPEED }),
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
