import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import type { AIConfig, TypeMessage } from "./types.js";

/**
 * Unified helper to call the appropriate LLM provider (OpenAI or Gemini) synchronously.
 */
export async function callLLM(
  config: AIConfig,
  systemInstruction: string,
  history: TypeMessage[]
): Promise<string> {
  if (config.provider === "gemini") {
    const ai = new GoogleGenAI({
      apiKey: config.apiKey || process.env.GEMINI_API_KEY || "",
    });

    // Map history to Gemini contents format
    // Roles in Gemini must be "user" or "model"
    const contents = history.map((msg) => {
      const role =
        msg.role === "assistant" ? ("model" as const) : ("user" as const);
      return {
        role,
        parts: [{ text: msg.content }],
      };
    });

    const response = await ai.models.generateContent({
      model: config.model,
      contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    // Fail Hnadler
    const candidate = response.candidates?.[0];
    if (candidate) {
      //   console.log("Finish Reason:", candidate.finishReason);

      // If it's empty because of safety filters:
      if (candidate.finishReason === "SAFETY") {
        console.log("Safety Ratings:", candidate.safetyRatings);
      }
    }

    return response.text || "";
  } else {
    // OpenAI or OpenAI-compatible (like Ollama, Groq, DeepSeek, etc.)
    const client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || "",
      baseURL: config.baseUrl || undefined,
    });

    // Map roles to OpenAI format: system, user, assistant
    const messages = [
      { role: "system" as const, content: systemInstruction },
      ...history.map((msg) => {
        let role: "user" | "assistant" | "system" = "user";
        if (msg.role === "assistant") {
          role = "assistant";
        } else if (msg.role === "system") {
          role = "system";
        } else if (msg.role === "developer") {
          role = "user"; // Map developer to user for prompt ingestion safety
        }
        return { role, content: msg.content };
      }),
    ];

    const response = await client.chat.completions.create({
      model: config.model,
      messages,
    });

    return response.choices[0]?.message?.content || "";
  }
}

/**
 * Unified helper to stream the appropriate LLM provider response.
 */
export async function* callLLMStream(
  config: AIConfig,
  systemInstruction: string,
  history: TypeMessage[]
): AsyncGenerator<string, void, unknown> {
  if (config.provider === "gemini") {
    const ai = new GoogleGenAI({
      apiKey: config.apiKey || process.env.GEMINI_API_KEY || "",
    });

    const contents = history.map((msg) => {
      const role =
        msg.role === "assistant" ? ("model" as const) : ("user" as const);
      return {
        role,
        parts: [{ text: msg.content }],
      };
    });

    const responseStream = await ai.models.generateContentStream({
      model: config.model,
      contents,
      config: {
        systemInstruction: systemInstruction,
      },
    });

    for await (const chunk of responseStream) {
      const chunkText = chunk.text;
      if (chunkText) {
        yield chunkText;
      }
    }
  } else {
    const client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENAI_API_KEY || "",
      baseURL: config.baseUrl || undefined,
    });

    const messages = [
      { role: "system" as const, content: systemInstruction },
      ...history.map((msg) => {
        let role: "user" | "assistant" | "system" = "user";
        if (msg.role === "assistant") {
          role = "assistant";
        } else if (msg.role === "system") {
          role = "system";
        } else if (msg.role === "developer") {
          role = "user";
        }
        return { role, content: msg.content };
      }),
    ];

    const stream = await client.chat.completions.create({
      model: config.model,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const chunkText = chunk.choices[0]?.delta?.content || "";
      if (chunkText) {
        yield chunkText;
      }
    }
  }
}
