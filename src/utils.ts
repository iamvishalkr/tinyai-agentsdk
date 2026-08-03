import type { TypeTool } from "./types.js";
import { MAIN_SYSTEM_PROPMT } from "./prompt.js";

/**
 * Builds the final instructions system prompt with tool declarations.
 */
export const constructAgentInstruction = (instructions: string, toolList?: TypeTool[]) => {
  let prompt = `${MAIN_SYSTEM_PROPMT}

System Prompt & Instructions:
${instructions}
`;

  if (toolList && toolList.length > 0) {
    prompt += `
Available Tools:
${toolList
  .map((t) =>
    JSON.stringify({
      functionName: t.name,
      functionDescription: t.description,
      functionDoc: t.doc || "",
    })
  )
  .join("\n")}
`;
  }
  return prompt;
};

/**
 * Robustly parses a JSON string response from an LLM.
 * Removes markdown block wraps (e.g. \`\`\`json ... \`\`\`) and isolates the outer-most JSON object.
 */
export const parseLLMJsonResponse = (content: string): any => {
  let cleaned = content.trim();

  // Strip markdown code block wrappers
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, "").replace(/\n?```$/, "");
    cleaned = cleaned.trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Extract everything between first '{' and last '}'
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extracted = cleaned.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(extracted);
      } catch (innerErr) {
        throw new Error(
          `Failed to parse extracted JSON object: ${(innerErr as Error).message}. Found text: ${extracted}`
        );
      }
    }
    throw new Error(`No valid JSON object structure found in response. Raw response: ${content}`);
  }
};