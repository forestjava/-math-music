import { setActiveSessionRuntime } from "../../src/session/activeRuntime";
import { SessionRuntime } from "../../src/session/runtime";
import { DEFAULT_SESSION_SETTINGS } from "../../src/session/settings";

export function setupDefaultRuntime(): SessionRuntime {
  const runtime = new SessionRuntime(DEFAULT_SESSION_SETTINGS);
  setActiveSessionRuntime(runtime);
  return runtime;
}
