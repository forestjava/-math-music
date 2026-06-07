import { HARMONIC_LABELS, slotForMemberIndex } from "./harmonic";
import { CHOIR_MEMBERS } from "./choirMembers";

/** Партитура: фиксированный слот гармоники на весь срок жизни участника хора. */
export function formatChoirRoster(): string {
  return CHOIR_MEMBERS.map(
    (m) => `${m.id} → слот ${HARMONIC_LABELS[slotForMemberIndex(m.index)]}`,
  ).join("\n");
}
