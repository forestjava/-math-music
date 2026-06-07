import { API_BASE } from "../../config/api";

export async function fetchNarratorAudio(prompt: string, speed: number): Promise<ArrayBuffer> {
  const res = await fetch(`${API_BASE}/narrator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, speed }),
  });

  if (!res.ok) throw new Error(await res.text());

  return res.arrayBuffer();
}

export function decodeNarratorBuffer(
  context: AudioContext,
  bytes: ArrayBuffer,
): Promise<AudioBuffer> {
  return context.decodeAudioData(bytes.slice(0));
}
