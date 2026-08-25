import { useEffect, useRef } from "react";

export interface SessionLogLine {
  id: number;
  time: string;
  text: string;
  kind: "info" | "error";
}

interface SessionLogProps {
  lines: SessionLogLine[];
}

const SessionLog = ({ lines }: SessionLogProps) => {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div
      ref={scrollerRef}
      aria-label="лог"
      className="min-h-0 flex-1 overflow-y-auto rounded-box bg-neutral-950 px-3 py-2 font-mono text-[11px] leading-5 text-neutral-200"
    >
      {lines.map((line) => (
        <p
          key={line.id}
          className={`whitespace-pre-wrap break-words ${line.kind === "error" ? "text-red-400" : ""}`}
        >
          <span className="text-neutral-500">{line.time} </span>
          {line.text}
        </p>
      ))}
    </div>
  );
};

export default SessionLog;
