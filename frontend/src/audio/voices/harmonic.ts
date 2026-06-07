/** Одиннадцать ролей относительно несущей: x1/32 … x32. Степень двойки для частоты. */
export type HarmonicSlot = -5 | -4 | -3 | -2 | -1 | 0 | 1 | 2 | 3 | 4 | 5;

export const HARMONIC_SLOT_MIN = -5;
export const HARMONIC_SLOT_MAX = 5;

export const HARMONIC_SLOTS: HarmonicSlot[] = [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];

export const CHOIR_MEMBER_COUNT = HARMONIC_SLOTS.length;

export const HARMONIC_LABELS: Record<HarmonicSlot, string> = {
  [-5]: "x1/32",
  [-4]: "x1/16",
  [-3]: "x1/8",
  [-2]: "x1/4",
  [-1]: "x1/2",
  [0]: "carrier",
  [1]: "x2",
  [2]: "x4",
  [3]: "x8",
  [4]: "x16",
  [5]: "x32",
};

export function slotForMemberIndex(memberIndex: number): HarmonicSlot {
  return (memberIndex + HARMONIC_SLOT_MIN) as HarmonicSlot;
}

export function memberIndexForSlot(slot: HarmonicSlot): number {
  return slot - HARMONIC_SLOT_MIN;
}

/** Частота слота = центр × 2^slot (только умножение/деление на 2 от базы). */
export function frequencyForSlot(centerHz: number, slot: HarmonicSlot): number {
  return centerHz * 2 ** slot;
}
