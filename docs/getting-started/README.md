---
title: Getting Started
nav_order: 3
permalink: /getting-started/
---

# Getting Started

This guide helps you install, configure, and run your first agent. The base is a minimal createAgent; a SmartAgent layer is available for planning + summarization.
This guide helps you install, configure, and run your first agent. You can choose between:

- **`createSmartAgent`** – includes planning, summarization, system prompt helpers, and built-in context tools.
- **`createAgent`** – minimal loop with no system prompt or summarization; perfect when you want full manual control.
## Prerequisites

- Node.js >= 18 (recommended LTS)
- A supported model provider API key (e.g. `OPENAI_API_KEY`) OR you can start with a fake model for offline experimentation.
- A supported model provider API key (e.g. `OPENAI_API_KEY`) **or** a fake model for offline experimentation.
- Package manager: npm, pnpm, or yarn (examples use npm).
## Why this agent?

You get: structured output, safe tool limits, optional planning/TODO mode (via SmartAgent), summarization of oversized context (SmartAgent), multi-agent composition, and clear logging – all with a small surface area.
You get a message-first loop with:

- Structured output enforcement via Zod schemas.
- Safe tool limits (total + parallel) with finalize messaging.
- Planning/TODO mode, summarization, and context tools when using `createSmartAgent`.
- Built-in multi-agent composition (`asTool`, `asHandoff`).
- LangChain and MCP compatibility without hard dependencies.
- Structured JSON tracing with optional payload capture.
## Install
```sh
npm install @cognipeer/agent-sdk @langchain/core
# Optional providers/helpers
npm install @langchain/openai zod
```

If you plan to use MCP or other adapters, also install the necessary packages (see future guides).
If you plan to use MCP or other adapters, install the relevant SDKs alongside the agent.
## Environment Setup

Expose your model key (OpenAI example):
```sh
export OPENAI_API_KEY=sk-...
```
Add this to your shell profile for persistence (`~/.zshrc` or similar).

## Your first agent (base)
## Option A: Smart agent with planning and summarization

```ts
import { createSmartAgent, createSmartTool, fromLangchainModel } from "@cognipeer/agent-sdk";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const echo = createSmartTool({
  name: "echo",
  description: "Echo back",
  schema: z.object({ text: z.string().min(1) }),
  func: async ({ text }) => ({ echoed: text }),
});

const model = fromLangchainModel(new ChatOpenAI({
  model: "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
}));

const agent = createSmartAgent({
  name: "Planner",
  model,
  tools: [echo],
  useTodoList: true,
  limits: { maxToolCalls: 5, maxToken: 6000 },
  tracing: { enabled: true },
});

const res = await agent.invoke({
  messages: [{ role: "user", content: "plan a greeting and send it via the echo tool" }],
});

console.log(res.content);
```

What happens:
1. A Zod-backed tool (`echo`) is registered.
2. The smart agent injects a system prompt with planning rules and exposes the `manage_todo_list` + `get_tool_response` helpers.
3. `invoke` runs the loop, executing tool calls until the assistant provides a final answer.
4. If tracing is enabled, a `trace.session.json` file is written under `logs/<session>/`.

## Option B: Minimal agent loop

import { createAgent, createTool, fromLangchainModel } from "@cognipeer/agent-sdk";
import { createAgent, createTool, fromLangchainModel } from "@cognipeer/agent-sdk";
import { z } from "zod";

const echo = createTool({
  name: "echo",
  description: "Echo back",
  schema: z.object({ text: z.string().min(1) }),
  func: async ({ text }) => ({ echoed: text }),
});

const model = fromLangchainModel(new ChatOpenAI({ model: "gpt-4o-mini", apiKey: process.env.OPENAI_API_KEY }));
const agent = createAgent({ model, tools: [echo], limits: { maxToolCalls: 5 } });

const res = await agent.invoke({ messages: [{ role: 'user', content: "say hi via echo" }] });
const res = await agent.invoke({ messages: [{ role: 'user', content: "say hi via echo" }] });
```

### What happened?
The base agent gives you full control: no system prompt, no planning rules, and no auto-summarization. Ideal when you already have prompt orchestration elsewhere.
### Optional: Offline Fake Model
## Optional: Offline fake model

If you have no API key yet, stub a fake model:
const fakeModel = { bindTools() { return this; }, async invoke(messages:any[]) { return { role:'assistant', content:'hello (fake)' }; } };
const agent = createAgent({ model: fakeModel as any });
```

## Adding Structured Output (base)
## Adding structured output

Provide `outputSchema` on either agent variant to validate & parse the final message. The framework exposes `res.output` when parsing succeeds and injects a finalize tool the model can call (`response`).
const Result = z.object({ title: z.string(), bullets: z.array(z.string()).min(1) });
const agent = createAgent({ model, outputSchema: Result });
const res = await agent.invoke({ messages: [{ role:'user', content:'Give 3 bullets about agents' }] });
if (res.output) console.log(res.output.bullets);
```

## Smart layer: Planning / TODO and Summarization
Listen for plan events:
await smart.invoke({ messages:[{ role:'user', content:'Plan and echo hi' }] }, { onEvent: e => { if(e.type==='plan') console.log('Plan size', e.todoList?.length); } });
await agent.invoke(
  { messages:[{ role:'user', content:'Plan and echo hi' }] },
  { onEvent: e => { if (e.type === 'plan') console.log('Plan size', e.todoList?.length ?? 0); } }
);

## Handling Tool Limits
Set caps to prevent runaway loops:
```ts
createAgent({ model, tools:[echo], limits: { maxToolCalls: 3, maxParallelTools: 2 } });
createAgent({ model, tools:[echo], limits: { maxToolCalls: 3, maxParallelTools: 2 } });
When the limit is hit, a system finalize message is injected and the next model turn must answer directly.

## Context summarization (SmartAgent)

Activate via `limits.maxToken` and adjust summarization targets:
```ts
limits: { maxToolCalls: 8, maxToken: 6000, contextTokenLimit: 4000, summaryTokenLimit: 600 }
```
Disable entirely by `summarization: false`.

## Tracing & observability
Enable structured JSON traces:
```ts
tracing: {
  enabled: true,
  writeToFile: true,       // set false to skip local disk
  onLog: (event) => console.debug("trace", event.id, event.label),
}
```
Files appear under `logs/<session>/trace.session.json` when `writeToFile` is `true`. Use `logData: false` for metrics-only output, `upload` to forward traces, or `onLog` to stream events directly into your logger.

## Quick capability tour

| Capability | How | Example Folder |
|------------|-----|----------------|
| Multiple Tools | tools array | `examples/tools` |
| Planning / TODO | `useTodoList: true` | `examples/todo-planning` |
| Tool Limits | `limits.maxToolCalls` | `examples/tool-limit` |
| Summarization | `limits.maxToken` | `examples/summarization` |
| Structured Output | `outputSchema` | `examples/structured-output` |
| Multi-Agent | `agent.asTool()` | `examples/multi-agent` |
| Handoff | `agent.asHandoff()` | `examples/handoff` |
| MCP Tools | MCP adapter client | `examples/mcp-tavily` |
| Vision Input | message parts with `image_url` | `examples/vision` |

## Next Steps

Proceed to:
- Architecture – understand the loop & phases.
- Tools – author richer tools and error handling.
- Limits & Tokens – tune summarization & caps.
- Examples – experiment hands-on.

## Troubleshooting

| Issue | Likely Cause | Fix |
|-------|--------------|-----|
| No tool calls emitted | Model lacks tool calling | Use OpenAI-compatible model or fake scenario |
| Summarization not triggering | `maxToken` not reached or disabled | Lower `maxToken` or remove `summarization:false` |
| Parsed output missing | Schema mismatch / invalid JSON | Inspect `res.content`, adjust prompt, broaden schema |
| Handoff ignored | Tool not included | Ensure `handoffs` array includes the target agent |
| Trace file missing | `tracing.enabled` false | Enable tracing or ensure the process can write to `logs/` |

If stuck, enable tracing and review the most recent `trace.session.json` for error metadata.

## Running examples

The repository ships runnable scripts in `examples/`. Build the package once (`npm run build` from repo root) and run with `tsx`, e.g.:

```sh
OPENAI_API_KEY=... npx tsx examples/tools/tools.ts
```

Each folder includes a README describing required environment variables and the capability it showcases.
