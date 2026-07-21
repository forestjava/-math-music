import {
  FAST_SESSION_INTERVALS,
  SOFT_SESSION_INTERVALS,
  type IntervalDefinition,
} from "./intervals";

export type SessionMode = "soft" | "fast";

export interface SessionModeDefinition {
  id: SessionMode;
  label: string;
  intervals: IntervalDefinition[];
}

export const SOFT_SESSION_MODE: SessionModeDefinition = {
  id: "soft",
  label: "Мягкий",
  intervals: SOFT_SESSION_INTERVALS,
};

export const FAST_SESSION_MODE: SessionModeDefinition = {
  id: "fast",
  label: "Быстрый",
  intervals: FAST_SESSION_INTERVALS,
};

export function getSessionModeDefinition(id: SessionMode): SessionModeDefinition {
  return id === "soft" ? SOFT_SESSION_MODE : FAST_SESSION_MODE;
}

export interface SessionSettings {
  durationMinutes: number;
  mode: SessionMode;
  loop: boolean;
}

export const DEFAULT_DURATION_MINUTES = 20;

export const DEFAULT_SESSION_SETTINGS: SessionSettings = {
  durationMinutes: DEFAULT_DURATION_MINUTES,
  mode: SOFT_SESSION_MODE.id,
  loop: false,
};
