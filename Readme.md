# TinyAI Agent SDK

A lightweight, powerful, and easy-to-use TypeScript/JavaScript SDK to build and run step-by-step reasoning AI agents. 

---

## Why TinyAI Agent SDK?

*   **Fast Integration:** Quickly build and deploy autonomous AI agents with minimal boilerplate.
*   **Simple & Intuitive:** Straightforward APIs for agent configuration, message history, and custom tool executions.
*   **Multi-Provider Compatibility:** Works out-of-the-box with **Google Gemini** (via `@google/genai`) and **OpenAI** (via `openai`), as well as OpenAI-compatible endpoints (like Ollama, Groq, DeepSeek).
*   **Production-Ready Loop:** Built-in ReAct reasoning loop ensures structural thinking and reliable self-correction.

---

## Agent Capabilities

*   **Step-by-Step Reasoning (ReAct Loop):** Follows a unified pipeline of steps (`INITIAL` ➔ `THINK` ➔ `TOOL_REQUEST` ➔ `ANALYZE` ➔ `OUTPUT`) to break down complex tasks and verify accuracy.
*   **Session-Based Memory:** Instantiated agents preserve conversation history automatically across multiple `.run()` invocations.
*   **Dynamic Tool Calling (Functions):** Easily register JavaScript/TypeScript functions as tools. The agent requests, executes, and digests the outcomes automatically.
*   **Real-time Streaming:** Stream raw text chunks to users as the agent thinks and responds in real time.
*   **Robust Self-Correction:** Detects malformed AI outputs, auto-injecting corrective developer feedback to guide the LLM back to valid steps without failing the run.

---

## Future Roadmap

We are constantly improving the SDK. Future capabilities will include:
*   🛡️ **Guardrails:** Input/output safety validation, response filtering, and behavior alignment checks.
*   🤝 **Handoffs:** Seamless delegation from one agent to another or escalating to a human operator.
*   📦 **State Persistence:** Built-in adapters for external storage (Redis, databases) to persist agent sessions.

---

## Documentation

For full guides, setup instructions, and code recipes, check out the [Full Documentation Guide (docs.md)](/docs.md).

### Quick Install

```bash
# Using npm
npm install tinyai-agentsdk

# Using pnpm
pnpm add tinyai-agentsdk

# Using yarn
yarn add tinyai-agentsdk
```

---

## License

ISC License. Feel free to use and customize for your own agentic applications!
