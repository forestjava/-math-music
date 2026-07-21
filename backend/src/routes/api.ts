import { Router } from "express";
import { synthesize } from "../services/yandexTts.js";
import { narrate } from "../services/narrator/narrate.js";
import {
  createSession,
  deleteSession,
  hasSession,
} from "../services/narrator/storylineStore.js";

export const apiRouter = Router();

interface SynthesizeBody {
  text?: string;
  speed?: number;
}

interface NarratorBody {
  sessionId?: string;
  prompt?: string;
  speed?: number;
}

apiRouter.post("/synthesize", async (req, res) => {
  const { text, speed = 0.75 } = req.body as SynthesizeBody;

  if (!text || typeof text !== "string" || !text.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  if (typeof speed !== "number") {
    res.status(400).json({ error: "speed must be a number" });
    return;
  }

  try {
    const result = await synthesize({ text, speed });
    res.setHeader("Content-Type", result.contentType);
    res.send(result.buffer);
  } catch (error) {
    console.error("[/synthesize] ошибка:", error);
    const message = error instanceof Error ? error.message : "TTS synthesis failed";
    res.status(502).json({ error: message });
  }
});

apiRouter.post("/session", (_req, res) => {
  const sessionId = createSession();
  res.json({ sessionId });
});

apiRouter.delete("/session/:id", (req, res) => {
  deleteSession(req.params.id);
  res.status(204).end();
});

apiRouter.post("/narrator", async (req, res) => {
  const { sessionId, prompt, speed = 0.75 } = req.body as NarratorBody;

  if (!sessionId || typeof sessionId !== "string") {
    res.status(400).json({ error: "sessionId is required" });
    return;
  }

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  if (typeof speed !== "number") {
    res.status(400).json({ error: "speed must be a number" });
    return;
  }

  if (!hasSession(sessionId)) {
    res.status(404).json({ error: "session not found" });
    return;
  }

  try {
    const result = await narrate({ sessionId, prompt, speed });
    res.setHeader("Content-Type", result.contentType);
    res.send(result.buffer);
  } catch (error) {
    console.error("[/narrator] ошибка:", error);
    const message = error instanceof Error ? error.message : "Narrator synthesis failed";
    res.status(502).json({ error: message });
  }
});
