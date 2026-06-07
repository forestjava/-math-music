import OpenAI from "openai";
import type { ChatMessage } from "./sessionStore.js";

const PERPLEXITY_BASE_URL = process.env.PERPLEXITY_BASE_URL ?? "https://api.perplexity.ai";
const MODEL = process.env.PERPLEXITY_MODEL ?? "sonar";
const TEMPERATURE = 1.5;
const TOP_P = 0.95;

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
    temperature: TEMPERATURE,
    top_p: TOP_P,
    frequency_penalty: 0.8,   // сильный штраф за повтор токенов → меньше "шаблонных" 
    presence_penalty: 0.6,    // штраф за возврат к уже использованным темам/мотивам
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Sonar вернул пустой ответ");
  }

  return text;
}
