import { CreateAgent, type TypeTool } from "./index.js";

// Mock weather tool
const weatherTool: TypeTool = {
  name: "getWeatherData",
  description: "Get the current weather details for a specific city",
  doc: "Parameters: input: string (e.g. 'Mumbai', 'London')",
  executor: async (input: string) => {
    console.log(`[Tool Execute] getWeatherData was called with input: "${input}"`);
    const city = input.toLowerCase().trim();
    if (city.includes("mumbai")) {
      return "Cloudy, 28°C, Humidity 80%";
    } else if (city.includes("goa")) {
      return "Sunny, 32°C, Humidity 65%";
    } else if (city.includes("london")) {
      return "Rainy, 15°C, Humidity 90%";
    }
    return `Weather for ${input} is sunny, 25°C`;
  },
};

// 1. OpenAI Configuration Example
const openAiAgent = CreateAgent({
  name: "OpenAI Weather Agent",
  instructions: "You are a professional weather assistant. Use the tools provided to answer weather questions.",
  toolList: [weatherTool],
  config: {
    provider: "openai",
    model: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY || "dummy-key", // Will use env variable if dummy key fails
  },
});

// 2. Gemini Configuration Example
const geminiAgent = CreateAgent({
  name: "Gemini Weather Agent",
  instructions: "You are a helpful weather assistant. Use the tools provided to retrieve current weather info.",
  toolList: [weatherTool],
  config: {
    provider: "gemini",
    model: "gemini-1.5-flash",
    apiKey: process.env.GEMINI_API_KEY || "dummy-key",
  },
});

// 3. Local/Compatible Provider Example (e.g., Ollama or DeepSeek via local endpoint)
const localAgent = CreateAgent({
  name: "Local LLM Weather Agent",
  instructions: "You are an assistant. Answer the question using tools.",
  toolList: [weatherTool],
  config: {
    provider: "openai", // compatible endpoints use openai client structure
    model: "llama3",
    baseUrl: "http://localhost:11434/v1", // Local Ollama
    apiKey: "ollama",
  },
});

async function main() {
  console.log("=== AI Agent SDK Weather Agent Demonstration ===");

  // Determine which provider to use based on available environment keys
  const hasOpenAiKey = process.env.OPENAI_API_KEY;
  const hasGeminiKey = process.env.GEMINI_API_KEY;

  if (!hasOpenAiKey && !hasGeminiKey) {
    console.log("\n[Notice] No API keys detected in environment (OPENAI_API_KEY or GEMINI_API_KEY).");
    console.log("To run actual LLM requests, run this command with your API keys set, e.g.:");
    console.log("Windows PowerShell: $env:OPENAI_API_KEY='your-key'; npx tsx src/example.ts\n");
    return;
  }

  const activeAgent = hasGeminiKey ? geminiAgent : openAiAgent;
  const providerName = hasGeminiKey ? "Gemini" : "OpenAI";

  console.log(`\nRunning agent using ${providerName} provider...\n`);

  try {
    const response = await activeAgent.run("What is the weather of Mumbai?", (chunk) => {
      if (chunk.step === "STREAM_CHUNK") {
        // Output raw character chunks if streaming is configured
        process.stdout.write(chunk.text || "");
      } else {
        console.log(`\n[Agent Step: ${chunk.step}] ${chunk.text || ""}`);
        if (chunk.functionName) {
          console.log(` >> Tool Request: ${chunk.functionName}(${chunk.input})`);
        }
      }
    });

    console.log("\n=== Final Response Output ===");
    console.log(`Agent Name: ${response.agentName}`);
    console.log(`Provider:   ${response.provider}`);
    console.log(`Model:      ${response.model}`);
    console.log(`Result:     ${response.output}`);
    console.log(`Total Turns: ${response.history.length}`);
  } catch (error) {
    console.error("Error running agent:", error);
  }
}

main();
