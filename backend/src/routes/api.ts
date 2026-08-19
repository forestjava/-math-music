import { Router } from "express";
import { synthesize } from "../services/tts/yandexTts.js";
import { abandonSession, refreshSession, startSession } from "../services/timeline/createSession.js";

export const apiRouter = Router();

interface SynthesizeBody {
  text?: string;
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

interface SessionBody {
  userInput?: string;
}

apiRouter.post("/session", async (req, res) => {
  const { userInput } = req.body as SessionBody;

  if (!userInput || typeof userInput !== "string" || !userInput.trim()) {
    res.status(400).json({ error: "userInput is required" });
    return;
  }

  try {
    const session = await startSession(userInput);
    res.json(session);
  } catch (error) {
    console.error("[/session] ошибка:", error);
    const message = error instanceof Error ? error.message : "Session scenario generation failed";
    res.status(502).json({ error: message });
  }
});

apiRouter.get("/session/:id", async (req, res) => {
  try {
    const snapshot = await refreshSession(req.params.id);
    if (!snapshot) {
      res.status(404).json({ error: "session not found" });
      return;
    }

    res.json(snapshot);
  } catch (error) {
    console.error("[/session/:id] ошибка:", error);
    const message = error instanceof Error ? error.message : "Session status retrieve failed";
    res.status(502).json({ error: message });
  }
});

apiRouter.delete("/session/:id", (req, res) => {
  void abandonSession(req.params.id);
  res.status(204).end();
});
