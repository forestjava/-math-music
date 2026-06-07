import { SessionRuntime } from "./runtime";
import { DEFAULT_SESSION_SETTINGS } from "./settings";

let activeRuntime = new SessionRuntime(DEFAULT_SESSION_SETTINGS);

export function getActiveSessionRuntime(): SessionRuntime {
  return activeRuntime;
}

export function setActiveSessionRuntime(runtime: SessionRuntime): void {
  activeRuntime = runtime;
}
