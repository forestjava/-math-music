import {
  ASCENT_INTERVAL_START,
  DESCENT_INTERVAL_COUNT,
  PLATEAU_INDEX,
} from "../../session/timeline";
import { INTERVALS } from "../../session/config";
import type { HarmonicSlot, VoicePlan, VoiceSegment } from "./types";

const INTERVAL_SHORT: Record<string, string> = {
  betaDescent: "β↓",
  alphaDescent: "α↓",
  thetaDescent: "θ↓",
  deltaPlateau: "δ",
  thetaAscent: "θ↑",
  alphaAscent: "α↑",
  betaAscent: "β↑",
};

function slotGainAtDescentStart(slot: HarmonicSlot): number {
  return slot <= 0 ? 2 ** slot : 2 ** -slot;
}

function slotGainAtDescentEnd(slot: HarmonicSlot): number {
  if (slot < 0) return 0;
  if (slot === 0) return 0.5;
  if (slot === 1) return 1;
  return slotGainAtDescentStart(slot) * 2;
}

function slotGainAtAscentStart(slot: HarmonicSlot): number {
  if (slot === -1) return 0.5;
  if (slot === 0) return 1;
  return slotGainAtDescentStart(slot);
}

function slotGainAtAscentEnd(slot: HarmonicSlot): number {
  if (slot === -1) return 1;
  if (slot === 0) return 0.5;
  if (slot === 1) return 0.25;
  if (slot === 2) return 0.125;
  return 0;
}

function descentCrossfade(slot: HarmonicSlot, hasNext: boolean): VoiceSegment["crossfade"] {
  if (!hasNext) return undefined;
  if (slot === 0 || slot === 1) return "descent-handoff";
  return undefined;
}

function ascentCrossfade(slot: HarmonicSlot, hasNext: boolean): VoiceSegment["crossfade"] {
  if (!hasNext) return undefined;
  if (slot === -1) return "ascent-handoff";
  return undefined;
}

function intervalLabel(index: number): string {
  return INTERVAL_SHORT[INTERVALS[index].kind] ?? INTERVALS[index].kind;
}

function formatSlot(slot: HarmonicSlot): string {
  const map: Record<HarmonicSlot, string> = {
    [-3]: "⅛",
    [-2]: "¼",
    [-1]: "½",
    [0]: "C",
    [1]: "×2",
    [2]: "×4",
    [3]: "×8",
  };
  return map[slot];
}

interface ActiveChain {
  id: string;
  segments: VoiceSegment[];
  slot: HarmonicSlot;
  alive: boolean;
  lastGain: number;
}

function addFadeVoice(
  plans: VoicePlan[],
  id: string,
  intervalIndex: number,
  slot: HarmonicSlot,
  lifecycle: string,
): void {
  plans.push({
    id,
    lifecycle,

    segments: [
      {
        intervalIndex,
        slot,
        gainStart: slotGainAtDescentStart(slot),
        gainEnd: 0,
      },
    ],
    tailFadeAfterInterval: intervalIndex,
    tailGain: 0,
  });
}

function pushDescentSegment(chain: ActiveChain, intervalIndex: number, slot: HarmonicSlot): void {
  const hasNext = intervalIndex < DESCENT_INTERVAL_COUNT - 1;
  const gainEnd = slotGainAtDescentEnd(slot);
  chain.segments.push({
    intervalIndex,
    slot,
    gainStart: slotGainAtDescentStart(slot),
    gainEnd,
    crossfade: descentCrossfade(slot, hasNext),
  });
  chain.slot = slot;
  chain.lastGain = gainEnd;
  chain.alive = slot >= 0 && gainEnd > 0;
}

function pushAscentSegment(chain: ActiveChain, intervalIndex: number, slot: HarmonicSlot): void {
  const hasNext = intervalIndex < INTERVALS.length - 1;
  const gainEnd = slotGainAtAscentEnd(slot);
  chain.segments.push({
    intervalIndex,
    slot,
    gainStart: slotGainAtAscentStart(slot),
    gainEnd,
    crossfade: ascentCrossfade(slot, hasNext),
  });
  chain.slot = slot;
  chain.lastGain = gainEnd;
  chain.alive = gainEnd > 0;
}

function finalizeChain(chain: ActiveChain): VoicePlan {
  const parts = chain.segments.map((seg) => {
    const peak = seg.slot === 0 ? " →gain1" : "";
    return `${intervalLabel(seg.intervalIndex)} ${formatSlot(seg.slot)} ${seg.gainStart.toFixed(2)}→${seg.gainEnd.toFixed(2)}${peak}`;
  });
  const last = chain.segments[chain.segments.length - 1];
  return {
    id: chain.id,
    lifecycle: parts.join(" | "),
    segments: chain.segments,

    tailFadeAfterInterval:
      chain.alive && last.intervalIndex < INTERVALS.length - 1 ? last.intervalIndex : undefined,
    tailGain: chain.lastGain,
  };
}

/**
 * Дедуплицированный план: 7 ролей на интервал, физические голосы переиспользуются между интервалами.
 *
 * Пример цепочки cascade-×2 (без дубликата с β↓-C):
 *   β↓ ×2 0.50→1.00 | α↓ C 1.00→0.50 →gain1 | θ↓ ½ 0.50→0.00 | …
 *
 * β↓-C (512→256, gain 1→0.5) = α↓-½ (256, gain 0.5→0) — один голос не нужен дважды.
 */

export function buildVoicePlan(): VoicePlan[] {
  const plans: VoicePlan[] = [];
  const chains: ActiveChain[] = [];
  for (let d = 0; d < DESCENT_INTERVAL_COUNT; d++) {
    const label = intervalLabel(d);
    if (d === 0) {
      addFadeVoice(plans, "β↓-½", d, -1, `${label} ½: spawn gain 0.5 → fade 0 @ end`);
    }

    addFadeVoice(plans, `${label}-¼`, d, -2, `${label} ¼: spawn gain 0.25 → fade 0 @ end`);
    addFadeVoice(plans, `${label}-⅛`, d, -3, `${label} ⅛: spawn gain 0.125 → fade 0 @ end`);
    if (d === 0) {
      for (const slot of [0, 1, 2, 3] as HarmonicSlot[]) {
        const chain: ActiveChain = {
          id: `cascade-${formatSlot(slot)}`,
          segments: [],
          slot,
          alive: true,
          lastGain: 1,
        };
        pushDescentSegment(chain, d, slot);
        chains.push(chain);
      }

      continue;
    }

    for (const chain of chains) {
      if (!chain.alive) continue;
      const nextSlot = (chain.slot - 1) as HarmonicSlot;
      if (nextSlot < -1) {
        chain.alive = false;
        continue;
      }

      pushDescentSegment(chain, d, nextSlot);
    }

    const h8: ActiveChain = {
      id: `cascade-${label}-×8`,
      segments: [],
      slot: 3,
      alive: true,
      lastGain: 0.125,
    };
    pushDescentSegment(h8, d, 3);
    chains.push(h8);
  }

  for (const chain of chains) {
    if (!chain.alive || chain.lastGain <= 0 || chain.slot < 0) continue;
    chain.segments.push({
      intervalIndex: PLATEAU_INDEX,
      slot: chain.slot,
      gainStart: chain.lastGain,
      gainEnd: chain.lastGain,
    });
  }

  const ascentSubs: ActiveChain[] = [];
  for (let a = 0; a < DESCENT_INTERVAL_COUNT; a++) {
    const intervalIndex = ASCENT_INTERVAL_START + a;
    const label = intervalLabel(intervalIndex);
    if (a === 0) {
      for (const chain of chains) {
        if (!chain.alive || chain.lastGain <= 0) continue;
        const slot = (chain.slot - 1) as HarmonicSlot;
        if (slot < -1) {
          chain.alive = false;
          continue;
        }

        pushAscentSegment(chain, intervalIndex, slot);
      }
    } else {
      for (const chain of chains) {
        if (!chain.alive || chain.lastGain <= 0) continue;
        const prev = chain.segments[chain.segments.length - 1];
        if (!prev || prev.intervalIndex !== intervalIndex - 1) continue;
        const slot = (chain.slot + 1) as HarmonicSlot;
        if (slot > 3) {
          chain.alive = false;
          continue;
        }

        pushAscentSegment(chain, intervalIndex, slot);
      }
    }

    for (const sub of ascentSubs) {
      if (!sub.alive) continue;
      const prev = sub.segments[sub.segments.length - 1];
      if (!prev || prev.intervalIndex !== intervalIndex - 1) continue;
      const slot = (sub.slot + 1) as HarmonicSlot;
      if (slot > 3) {
        sub.alive = false;
        continue;
      }

      pushAscentSegment(sub, intervalIndex, slot);
    }

    const sub: ActiveChain = {
      id: `ascent-${label}-½`,
      segments: [],
      slot: -1,
      alive: true,
      lastGain: 0.5,
    };
    pushAscentSegment(sub, intervalIndex, -1);
    ascentSubs.push(sub);
  }

  for (const chain of [...chains, ...ascentSubs]) {
    if (chain.segments.length > 0) {
      plans.push(finalizeChain(chain));
    }
  }

  return plans.sort((a, b) => a.id.localeCompare(b.id));
}

export function formatVoicePlanDocument(plans: VoicePlan[]): string {
  return [
    "=== Дедуплицированный план осцилляторов (1 голос = 1 Web Audio Oscillator на канал) ===",
    "",
    ...plans.map((p) => `[${p.id}] ${p.lifecycle}`),
    "",
    `Всего: ${plans.length} голосов × 2 канала = ${plans.length * 2} осцилляторов`,
  ].join("\n");
}

export const VOICE_PLAN = buildVoicePlan();
