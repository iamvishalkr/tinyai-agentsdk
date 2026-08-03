export type OpenAIModels = "gpt-4o" | "gpt-4o-mini" | "gpt-4-turbo" | "gpt-3.5-turbo";
export type GeminiModels = "gemini-2.0-flash" | "gemini-1.5-pro" | "gemini-1.5-flash" | "gemini-1.0-pro";

export type AIConfig =
  | {
      provider: "openai";
      model: OpenAIModels | (string & {});
      apiKey?: string;
      baseUrl?: string;
    }
  | {
      provider: "gemini";
      model: GeminiModels | (string & {});
      apiKey?: string;
      baseUrl?: string;
    };

export type TypeMessage = {
  role: "user" | "assistant" | "developer" | "system";
  content: string;
};

export type TypeTool = {
  name: string;
  description: string;
  doc?: string;
  executor: (input: string) => Promise<string>;
};

export type AgentResult = {
  agentName: string;
  provider: "openai" | "gemini";
  model: string;
  output: string;
  history: TypeMessage[];
};

export type StreamCallback = (chunk: {
  step: string;
  text?: string;
  functionName?: string;
  input?: string;
}) => void;

