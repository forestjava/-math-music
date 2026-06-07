import type { VoiceSample } from "../../src/audio/voices/types";

export function nearlyEqual(a: number, b: number): boolean {
  if (a === b) return true;
  const scale = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) <= 1e-5 * scale;
}

export function voiceSampleEqual(a: VoiceSample, b: VoiceSample): boolean {
  return nearlyEqual(a.frequency, b.frequency) && nearlyEqual(a.gain, b.gain);
}
