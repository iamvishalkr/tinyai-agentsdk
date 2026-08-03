import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import type {
  AIConfig,
  TypeMessage,
  TypeTool,
  AgentResult,
  StreamCallback,
} from "./types.js";
import { constructAgentInstruction, parseLLMJsonResponse } from "./utils.js";
import { callLLM, callLLMStream } from "./provider.js";

type AgentProps = {
  name: string;
  description?: string;
  instructions: string;
  toolList?: TypeTool[];
  config?: AIConfig;
  responseType?: "chat" | "stream";
};

export class Agent {
  private MAX_LOOP = 15;
  private instructions: string;
  private messageHistory: TypeMessage[] = [];
  private toolMap: Map<string, TypeTool> = new Map();
  public toolList: TypeTool[] = [];
  private client: {
    provider: OpenAI | GoogleGenAI;
    type: "openai" | "gemini";
  } | null = null;
  private name: string;
  private description: string;
  private config: AIConfig;
  private responseType: "chat" | "stream" = "chat";

  constructor({
    name,
    description,
    instructions,
    toolList,
    config,
    responseType,
  }: AgentProps) {
    this.name = name;
    this.description = description || "";
    this.toolList = toolList || [];
    this.instructions = constructAgentInstruction(instructions, this.toolList);
    this.config = config || {
      provider: "openai",
      model: "gpt-3.5-turbo",
    };
    this.responseType = responseType || "chat";

    // Populate toolMap for fast O(1) lookup
    for (const tool of this.toolList) {
      this.toolMap.set(tool.name, tool);
    }

    this.setClient();
  }

  private setClient() {
    if (this.config.provider === "gemini") {
      this.client = {
        type: "gemini",
        provider: new GoogleGenAI({
          apiKey: this.config.apiKey || process.env.GEMINI_API_KEY || "",
        }),
      };
    } else {
      this.client = {
        type: "openai",
        provider: new OpenAI({
          apiKey: this.config.apiKey || process.env.OPENAI_API_KEY || "",
          baseURL: this.config.baseUrl || undefined,
        }),
      };
    }
  }

  /**
   * Executes the agent workflow loop based on input query.
   * Calls the LLM, parses steps (INITIAL, THINK, ANALYZE, TOOL_REQUEST, OUTPUT),
   * executes tools when requested, feeds responses back, and repeats until OUTPUT is reached.
   */
  public async run(
    query: string,
    onStreamChunk?: StreamCallback
  ): Promise<AgentResult> {
    // Append user query to message history
    this.messageHistory.push({ role: "user", content: query });

    let finalOutput = "";

    for (let i = 0; i < this.MAX_LOOP; i++) {
      let rawLLMResponse = "";

      if (this.responseType === "stream" && onStreamChunk) {
        // Stream response from the LLM
        const stream = callLLMStream(
          this.config,
          this.instructions,
          this.messageHistory
        );
        for await (const chunk of stream) {
          rawLLMResponse += chunk;
          onStreamChunk({ step: "STREAM_CHUNK", text: chunk });
        }
      } else {
        // Call the LLM synchronously
        rawLLMResponse = await callLLM(
          this.config,
          this.instructions,
          this.messageHistory
        );
      }

      // Append assistant thought/step response to history
      this.messageHistory.push({ role: "assistant", content: rawLLMResponse });

      // Robustly parse the raw response to JSON
      let parsedResult;
      try {
        parsedResult = parseLLMJsonResponse(rawLLMResponse);
      } catch (err) {
        // If JSON parsing fails, report it back as developer feedback so LLM can auto-correct
        const errorMsg = `Error parsing JSON response: ${
          (err as Error).message
        }. Please output strictly valid JSON matching the schema.`;
        this.messageHistory.push({ role: "developer", content: errorMsg });
        if (onStreamChunk) {
          onStreamChunk({ step: "ERROR", text: errorMsg });
        }
        continue;
      }

      // Notify callback of the parsed step details
      if (onStreamChunk && parsedResult.step) {
        onStreamChunk({
          step: parsedResult.step,
          text: parsedResult.text,
          functionName: parsedResult.functionName,
          input: parsedResult.input,
        });
      }

      if (
        parsedResult.step.toUpperCase() === "INITIAL" ||
        parsedResult.step.toUpperCase() === "THINK" ||
        parsedResult.step.toUpperCase() === "ANALYZE"
      ) {
        // The AI is just thinking. We MUST give it a user prompt to trigger the next step.
        this.messageHistory.push({ role: "user", content: "Proceed to the next step." });
        continue;
      }

      // Stop condition: Output step reached
      if (parsedResult.step.toUpperCase() === "OUTPUT") {
        finalOutput =
          parsedResult.text || parsedResult.content || rawLLMResponse;
        break;
      }

      // Tool request step execution
      if (parsedResult.step.toUpperCase() === "TOOL_REQUEST") {
        const { functionName, input } = parsedResult;

        if (!functionName) {
          const errorMsg =
            "Error: TOOL_REQUEST step requires 'functionName' parameter.";
          this.messageHistory.push({ role: "developer", content: errorMsg });
          if (onStreamChunk) {
            onStreamChunk({ step: "ERROR", text: errorMsg });
          }
          continue;
        }

        const tool = this.toolMap.get(functionName);
        if (!tool) {
          const errorMsg = `Error: Tool with name '${functionName}' does not exist.`;
          this.messageHistory.push({ role: "developer", content: errorMsg });
          if (onStreamChunk) {
            onStreamChunk({ step: "ERROR", text: errorMsg });
          }
          continue;
        }

        try {
          if (onStreamChunk) {
            onStreamChunk({
              step: "TOOL_EXECUTION_START",
              text: `Executing tool '${functionName}' with input: ${input}`,
            });
          }

          // Execute tool and append result to history
          const toolResult = await tool.executor(input || "");
          this.messageHistory.push({
            role: "developer",
            content: JSON.stringify({
              functionName,
              input,
              toolResult,
            }),
          });

          if (onStreamChunk) {
            onStreamChunk({
              step: "TOOL_EXECUTION_SUCCESS",
              text: `Tool '${functionName}' execution succeeded.`,
            });
          }
        } catch (toolErr) {
          const errorMsg = `Error executing tool '${functionName}': ${
            (toolErr as Error).message
          }`;
          this.messageHistory.push({
            role: "developer",
            content: errorMsg,
          });
          if (onStreamChunk) {
            onStreamChunk({ step: "ERROR", text: errorMsg });
          }
        }
      }
    }

    return {
      agentName: this.name,
      provider: this.config.provider,
      model: this.config.model,
      output: finalOutput,
      history: this.messageHistory,
    };
  }
}

/**
 * Convenience factory function to create an Agent instance.
 */
export const CreateAgent = (props: AgentProps) => {
  return new Agent(props);
};
