import { Router } from "express";
import { synthesize } from "../services/yandexTts.js";

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
    const message = error instanceof Error ? error.message : "TTS synthesis failed";
    res.status(502).json({ error: message });
  }
});

apiRouter.post("/narrator", (_req, res) => {
  res.status(501).json({ error: "not_implemented" });
});
