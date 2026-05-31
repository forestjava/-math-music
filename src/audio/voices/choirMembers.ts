import { CHOIR_MEMBER_COUNT, HARMONIC_LABELS, slotForMemberIndex } from "./harmonic";

export interface ChoirMember {
  index: number;
  id: string;
  slot: ReturnType<typeof slotForMemberIndex>;
}

export const CHOIR_MEMBERS: ChoirMember[] = Array.from({ length: CHOIR_MEMBER_COUNT }, (_, index) => {
  const slot = slotForMemberIndex(index);
  return {
    index,
    id: `ch-${HARMONIC_LABELS[slot]}`,
    slot,
  };
});
