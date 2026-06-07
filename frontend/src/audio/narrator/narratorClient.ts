import { API_BASE } from "../../config/api";

export async function initNarratorSession(): Promise<string> {
  const res = await fetch(`${API_BASE}/session`, { method: "POST" });

  if (!res.ok) throw new Error(await res.text());

  const data = (await res.json()) as { sessionId: string };
  return data.sessionId;
}

export async function finalizeNarratorSession(sessionId: string): Promise<void> {
  await fetch(`${API_BASE}/session/${sessionId}`, { method: "DELETE" });
}

export async function fetchNarratorAudio(
  sessionId: string,
  prompt: string,
  speed: number,
): Promise<ArrayBuffer> {
  const res = await fetch(`${API_BASE}/narrator`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, prompt, speed }),
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
