import { useEffect, useRef, useState } from "react";
import { BinauralSessionEngine, type PlaybackState } from "../audio/binauralEngine";
import { DEFAULT_SESSION_SETTINGS } from "../session/settings";

const Player = () => {
  const engineRef = useRef<BinauralSessionEngine | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_SESSION_SETTINGS.userInput);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("stopped");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const engine = new BinauralSessionEngine({ ...DEFAULT_SESSION_SETTINGS });
    engineRef.current = engine;
    engine.setValuesListener((values) => {
      setPlaybackState(values.playbackState);
      setError(values.error);
    });

    return () => {
      engine.setValuesListener(null);
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
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <textarea
        className="textarea min-h-32 w-full"
        value={prompt}
        disabled={!stopped}
        onChange={(event) => {
          const userInput = event.target.value;
          setPrompt(userInput);
          applyPrompt(userInput);
        }}
      />
      <div className="flex gap-2">
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
      <p className={error ? "text-error" : undefined}>{statusText(playbackState, error)}</p>
    </div>
  );
};

function statusText(state: PlaybackState, error: string | null): string {
  if (error) return error;
  if (state === "preparing") return "pending scenario";
  if (state === "playing") return "playing";
  if (state === "paused") return "paused";
  return "stopped";
}

export default Player;
