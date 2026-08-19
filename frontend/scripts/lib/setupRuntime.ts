import { setActiveSessionRuntime } from "../../src/session/activeRuntime";
import { SessionRuntime } from "../../src/session/runtime";
import { CHECK_DURATION_SECONDS, DEFAULT_SESSION_SETTINGS } from "../../src/session/settings";

export function setupDefaultRuntime(): SessionRuntime {
  const runtime = new SessionRuntime(DEFAULT_SESSION_SETTINGS, CHECK_DURATION_SECONDS);
  setActiveSessionRuntime(runtime);
  return runtime;
}
