import Perplexity from "@perplexity-ai/perplexity_ai";

const AGENT_TOOLS = [
  { type: "web_search" as const },
  { type: "fetch_url" as const },
  { type: "sandbox" as const },
];

export const TERMINAL_STATUSES = ["completed", "failed", "cancelled", "incomplete"] as const;

export type AgentRunStatus = string;

export interface BackgroundRun {
  id: string;
  status: AgentRunStatus;
}

export interface RetrievedRun {
  status: AgentRunStatus;
  outputText: string;
  errorMessage: string | null;
}

function createClient(): Perplexity {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY не задан");
  }

  return new Perplexity({ apiKey });
}

function formatAgentError(error: unknown): string | null {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Agent API вернул ошибку";
  }
}

/** Старт Agent API в background: сразу id и status, без ожидания текста. */
export async function startBackgroundScenario(
  instructions: string,
  userInput: string,
): Promise<BackgroundRun> {
  const client = createClient();
  const response = await client.responses.create({
    preset: "high",
    instructions,
    input: userInput,
    tools: AGENT_TOOLS,
    background: true,
    temperature: 1.1,
  });

  if (!response.id) {
    throw new Error("Agent API не вернул id ответа");
  }

  return {
    id: response.id,
    status: response.status ?? "queued",
  };
}

/** Снимок background-ответа по id Perplexity. */
export async function retrieveBackgroundScenario(responseId: string): Promise<RetrievedRun> {
  const client = createClient();
  const response = await client.responses.retrieve(responseId);

  return {
    status: response.status ?? "in_progress",
    outputText: extractOutputText(response.output).trim(),
    errorMessage: formatAgentError(response.error),
  };
}

function extractOutputText(output: unknown): string {
  if (!Array.isArray(output)) return "";

  const texts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object" || !("type" in item) || item.type !== "message") continue;
    const content = "content" in item ? item.content : undefined;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const type = "type" in part ? part.type : undefined;
      const text = "text" in part ? part.text : undefined;
      if (type === "output_text" && typeof text === "string") texts.push(text);
    }
  }
  return texts.join("");
}

export async function cancelBackgroundScenario(responseId: string): Promise<void> {
  const client = createClient();
  try {
    await client.responses.cancel(responseId);
  } catch {
    // Уже терминальный статус или неизвестный id — локальную сессию всё равно удаляем.
  }
}

export function isTerminalStatus(status: string): boolean {
  return (TERMINAL_STATUSES as readonly string[]).includes(status);
}
