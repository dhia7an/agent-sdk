# Basic Agent Example

A minimal example demonstrating the core agent loop with tools.

## Overview

This example shows how to:
- Create a simple tool with Zod schema
- Set up a smart agent
- Run a basic invocation
- Handle the result

## Code

[View full source](https://github.com/Cognipeer/agent-sdk/tree/main/examples/basic)

\`\`\`typescript
import { createSmartAgent, createTool, fromLangchainModel } from "@cognipeer/agent-sdk";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

// Define a simple echo tool
const echo = createTool({
  name: "echo",
  description: "Echo back the input text",
  schema: z.object({ 
    text: z.string().min(1).describe("Text to echo") 
  }),
  func: async ({ text }) => {
    return { echoed: text, timestamp: new Date().toISOString() };
  },
});

// Create model adapter
const model = fromLangchainModel(
  new ChatOpenAI({
    model: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
  })
);

// Create agent
const agent = createSmartAgent({
  name: "EchoBot",
  model,
  tools: [echo],
  limits: { maxToolCalls: 5 },
  tracing: { enabled: true },
});

// Run agent
const result = await agent.invoke({
  messages: [
    { role: "user", content: "Please echo 'Hello, World!'" }
  ],
});

console.log("Result:", result.content);
console.log("Usage:", result.usage);
\`\`\`

## Running

\`\`\`bash
export OPENAI_API_KEY=sk-...
npm run example:basic
\`\`\`

## Expected Output

\`\`\`
Result: I've echoed your message: "Hello, World!" with timestamp 2025-10-09T...
Usage: { input_tokens: 145, output_tokens: 28, total_tokens: 173 }
\`\`\`

## Key Concepts

### Tool Definition

Tools use Zod schemas for type-safe parameter validation:

\`\`\`typescript
const tool = createTool({
  name: "tool_name",
  description: "What the tool does",
  schema: z.object({ /* parameters */ }),
  func: async (params) => { /* implementation */ },
});
\`\`\`

### Agent Configuration

Minimal agent setup requires:
- **model**: Model adapter (LangChain, custom, etc.)
- **tools**: Array of tool objects
- **limits**: Optional execution limits

### Invocation

Call \`agent.invoke()\` with messages:

\`\`\`typescript
const result = await agent.invoke({
  messages: [{ role: "user", content: "..." }],
});
\`\`\`

## Trace Output

With tracing enabled, check `logs/[session]/trace.session.json` for execution details.

## Next Steps

- [Add more tools](/guide/tool-development)
- [Enable planning](/examples/planning)
- [Add guardrails](/examples/guardrails)
