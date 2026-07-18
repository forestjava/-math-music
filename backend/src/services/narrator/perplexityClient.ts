import OpenAI from "openai";
import type { ChatMessage } from "./sessionStore.js";

const PERPLEXITY_BASE_URL = process.env.PERPLEXITY_BASE_URL ?? "https://api.perplexity.ai";
const MODEL = process.env.PERPLEXITY_MODEL ?? "sonar";

/** Генерирует текст рассказчика из системного промпта и истории сеанса. */
export async function generateNarration(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY не задан");
  }

  const client = new OpenAI({ apiKey, baseURL: PERPLEXITY_BASE_URL });

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 1.2,
    top_p: 0.6,
    frequency_penalty: 2.0,
    max_tokens: 1200,           // максимальное количество токенов в ответе
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Sonar вернул пустой ответ");
  }

  return text;
}
