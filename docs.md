# TinyAI Agent SDK Documentation

Welcome to the **TinyAI Agent SDK** documentation. This guide details how to install, configure, and use the SDK to build intelligent agents powered by Google Gemini and OpenAI.

---

## Table of Contents

1. [Installation](#installation)
2. [Quick Start](#quick-start)
3. [Configuration & Providers](#configuration--providers)
4. [Agent Capabilities & Features](#agent-capabilities--features)
    - [Memory & Session Preservation](#memory--session-preservation)
    - [Real-time Streaming](#real-time-streaming)
    - [Structured Tool/Function Execution](#structured-toolfunction-execution)
5. [API Reference](#api-reference)
6. [Examples](#examples)

---

## Installation

Install the package via your preferred package manager:

```bash
# Using npm
npm install tinyai-agentsdk

# Using pnpm
pnpm add tinyai-agentsdk

# Using yarn
yarn add tinyai-agentsdk
```

Make sure you have your API keys configured as environment variables (or pass them directly into the agent configuration):

```bash
# Set your environment variables
export GEMINI_API_KEY="your-gemini-key"
export OPENAI_API_KEY="your-openai-key"
```

---

## Quick Start

Create a script (e.g., `index.js` or `index.ts`) to run your first agent:

```typescript
import { CreateAgent } from "tinyai-agentsdk";

// Define a simple agent
const agent = CreateAgent({
  name: "Assistant Agent",
  instructions: "You are a direct and concise assistant.",
  config: {
    provider: "openai",
    model: "gpt-4o-mini"
  }
});

// Run the agent
const response = await agent.run("What is the capital of France?");
console.log(response.output); // "The capital of France is Paris."
```

---

## Configuration & Providers

The SDK supports both Google Gemini and OpenAI. When creating an agent, you define its configuration using the `config` object:

### OpenAI Configuration
```typescript
const agent = CreateAgent({
  name: "OpenAI Agent",
  instructions: "...",
  config: {
    provider: "openai",
    model: "gpt-4o", // supports: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo, etc.
    apiKey: "your-openai-key",
  }
});
```

### OpenAI-Compatible Endpoints (Proxies)

Because `provider: "openai"` uses the official OpenAI client under the hood, you can easily point it to any OpenAI-compatible API (like Groq, DeepSeek, Ollama, or third-party gateways) by supplying a custom `baseUrl` and `apiKey`.

```typescript
const agent = CreateAgent({
  name: "OpenAi Compatible Agent",
  instructions: "...",
  config: {
    provider: "openai",
    model: "gpt-4o-mini", // or the specific model your endpoint uses
    apiKey: "your-custom-proxy-key",
    baseUrl: "https://custom-proxy-url/v1" // The base URL of the compatible proxy
  }
});
```

### Local/Compatible Provider Example (e.g., Ollama / Self-hosted or DeepSeek via local endpoint)

```typescript
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
```
### Google Gemini Configuration
```typescript
const agent = CreateAgent({
  name: "Gemini Agent",
  instructions: "...",
  config: {
    provider: "gemini",
    model: "gemini-1.5-flash", // supports: gemini-2.0-flash, gemini-1.5-pro, gemini-1.5-flash, gemini-1.0-pro, etc.
    apiKey: "your-gemini-key" // optional: defaults to process.env.GEMINI_API_KEY
  }
});
```

---

## Agent Capabilities & Features

### Memory & Session Preservation

Every instance of `Agent` preserves its message history in memory. If you invoke the `.run()` method multiple times on the same instance, it will naturally remember previous turns, acting as an active conversation session.

```typescript
const agent = CreateAgent({
  name: "ChatBot",
  instructions: "Remember user's preferences."
});

// Turn 1
await agent.run("Hi, my name is John.");

// Turn 2
const response = await agent.run("What is my name?");
console.log(response.output); // "Your name is John."
```

---

### Real-time Streaming

You can stream response chunks token-by-token or observe execution steps in real time. Set `responseType` to `"stream"` and pass a callback to `.run()`.

```typescript
const agent = CreateAgent({
  name: "Streaming Agent",
  instructions: "Write a short poem about coding.",
  responseType: "stream"
});

await agent.run("Go!", (chunk) => {
  if (chunk.step === "STREAM_CHUNK") {
    // Write characters to stdout as they arrive
    process.stdout.write(chunk.text || "");
  } else {
    // Observe reasoning milestones
    console.log(`\n[Step: ${chunk.step}] ${chunk.text || ""}`);
  }
});
```

---

### Structured Tool/Function Execution

You can supply custom JavaScript/TypeScript tools directly to the agent. Tools are structured functions that return a `Promise<string>` and are registered using the `TypeTool` interface.

```typescript
import type { TypeTool } from "tinyai-agentsdk";

const myCalculatorTool: TypeTool = {
  name: "calculateSquare",
  description: "Calculate the square of a number",
  doc: "Parameters: input: string (the number, e.g. '5')",
  executor: async (input: string) => {
    const num = parseFloat(input);
    return String(num * num);
  }
};

const agent = CreateAgent({
  name: "Math Agent",
  instructions: "Use tools to calculate math properties.",
  toolList: [myCalculatorTool]
});

const result = await agent.run("What is the square of 9?");
console.log(result.output); // Output containing "81"
```

---

## API Reference

### `CreateAgent(props: AgentProps)`
A factory helper to create an `Agent` instance.

#### `AgentProps` Parameters
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | Yes | Human-readable name of the agent. |
| `description` | `string` | No | Internal description detailing the agent's focus. |
| `instructions` | `string` | Yes | The system instructions / prompt defining the agent's persona and rules. |
| `toolList` | `TypeTool[]` | No | Custom list of executable tools. |
| `config` | `AIConfig` | No | Provider configuration (defaults to `openai` / `gpt-3.5-turbo`). |
| `responseType` | `"chat" \| "stream"` | No | Response delivery mode (defaults to `"chat"`). |

### `Agent.run(query: string, onStreamChunk?: StreamCallback)`
Runs the agent loop. Parses instructions, executes the reasoning pipeline, triggers tools automatically, feeds outcomes back to the model, and returns a final payload once the agent yields the `OUTPUT` step.

- Returns `Promise<AgentResult>`.

#### `AgentResult` Structure
```typescript
type AgentResult = {
  agentName: string;
  provider: "openai" | "gemini";
  model: string;
  output: string;
  history: TypeMessage[];
};
```

#### `StreamCallback` Payload
```typescript
type StreamCallback = (chunk: {
  step: string;           // "STREAM_CHUNK", "INITIAL", "THINK", "TOOL_REQUEST", "ANALYZE", "OUTPUT", "ERROR" etc.
  text?: string;          // Current segment text or step analysis description
  functionName?: string;  // Name of the requested function (for TOOL_REQUEST)
  input?: string;         // Input argument of the requested function
}) => void;
```

---

## Examples

### Complex Multi-Turn Agent with Tools

Below is a complete implementation showing how the agent performs a ReAct loop with a mock tool.

```typescript
import { CreateAgent } from "tinyai-agentsdk";
import type { TypeTool } from "tinyai-agentsdk";

const weatherTool: TypeTool = {
  name: "getWeatherData",
  description: "Get the current weather details for a specific city",
  doc: "Parameters: input: string (e.g. 'Mumbai')",
  executor: async (input: string) => {
    // Fetch API or local database here
    return `Cloudy, 28°C, Humidity 80% in ${input}`;
  },
};

const agent = CreateAgent({
  name: "Weather Agent",
  instructions: "You are a weather assistant. Retrieve weather info using tools.",
  toolList: [weatherTool],
  config: {
    provider: "gemini",
    model: "gemini-1.5-flash",
  },
  responseType: "chat",
});

const runAgent = async () => {
  const result = await agent.run(
    "What is the weather of Mumbai?",
    (chunk) => {
      console.log(`[Step: ${chunk.step}] ${chunk.text || ""}`);
      if (chunk.functionName) {
        console.log(` -> Requested Tool: ${chunk.functionName}(${chunk.input})`);
      }
    }
  );
  
  console.log("Result:", result.output);
};

runAgent();
```
