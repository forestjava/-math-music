import { Router } from "express";
import { synthesize } from "../services/yandexTts.js";
import { narrateDebug } from "../services/narratorDebug.js";

export const apiRouter = Router();

interface SynthesizeBody {
  text?: string;
  speed?: number;
}

interface NarratorBody {
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
    const message = error instanceof Error ? error.message : "TTS synthesis failed";
    res.status(502).json({ error: message });
  }
});

apiRouter.post("/narrator", async (req, res) => {
  const { prompt, speed = 0.75 } = req.body as NarratorBody;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  if (typeof speed !== "number") {
    res.status(400).json({ error: "speed must be a number" });
    return;
  }

  try {
    const result = await narrateDebug({ prompt, speed });
    res.setHeader("Content-Type", result.contentType);
    res.send(result.buffer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Narrator synthesis failed";
    res.status(502).json({ error: message });
  }
});
