import { useEffect, useRef, useState } from "react";
import { BinauralSessionEngine, type PlaybackState } from "../audio/binauralEngine";
import { DEFAULT_SESSION_SETTINGS } from "../session/settings";
import SessionLog, { type SessionLogLine } from "./SessionLog";

const Player = () => {
  const engineRef = useRef<BinauralSessionEngine | null>(null);
  const logIdRef = useRef(0);
  const [prompt, setPrompt] = useState(DEFAULT_SESSION_SETTINGS.userInput);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("stopped");
  const [logLines, setLogLines] = useState<SessionLogLine[]>([]);

  useEffect(() => {
    const engine = new BinauralSessionEngine({ ...DEFAULT_SESSION_SETTINGS });
    engineRef.current = engine;
    engine.setValuesListener((values) => {
      setPlaybackState(values.playbackState);
    });
    engine.setLogListener((event) => {
      if (event.type === "clear") {
        setLogLines([]);
        return;
      }

      logIdRef.current += 1;
      const time = new Date().toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const line: SessionLogLine = {
        id: logIdRef.current,
        time,
        text: event.text,
        kind: event.kind,
      };
      setLogLines((prev) => {
        const next = [...prev, line];
        return next.length > 200 ? next.slice(-200) : next;
      });
    });

    return () => {
      engine.setValuesListener(null);
      engine.setLogListener(null);
      engine.stop();
      engineRef.current = null;
    };
  }, []);

  const stopped = playbackState === "stopped";
  const preparing = playbackState === "preparing";

  const applyPrompt = (userInput: string) => {
    engineRef.current?.setSessionSettings({
      ...DEFAULT_SESSION_SETTINGS,
      userInput,
    });
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-[400px] flex-col gap-4 overflow-hidden p-4">
      <textarea
        className="textarea h-[250px] min-h-[250px] w-full shrink-0 resize-none"
        value={prompt}
        disabled={!stopped}
        onChange={(event) => {
          const userInput = event.target.value;
          setPrompt(userInput);
          applyPrompt(userInput);
        }}
      />
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          className="btn btn-primary"
          disabled={preparing}
          onClick={() => {
            applyPrompt(prompt);
            void engineRef.current?.toggle();
          }}
        >
          {playbackState === "playing" ? "Pause" : "Play"}
        </button>
        <button type="button" className="btn" onClick={() => engineRef.current?.stop()}>
          Stop
        </button>
      </div>
      <SessionLog lines={logLines} />
    </div>
  );
};

export default Player;
