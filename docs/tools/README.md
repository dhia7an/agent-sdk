---
title: Tools
nav_order: 7
permalink: /tools/
---

# Tools

## createSmartTool / createTool

Define tools quickly with a Zod schema and an async function. `createTool` is an alias maintained for compatibility; both behave the same.

```ts
import { createSmartTool } from "@cognipeer/agent-sdk";
import { z } from "zod";

const search = createSmartTool({
  name: "search",
  description: "Simple search",
  schema: z.object({ q: z.string() }),
  func: async ({ q }) => ({ results: [`You searched: ${q}`] }),
});
```

Under the hood the helper yields a LangChain-compatible `ToolInterface`, so any LangChain-enabled adapter can interoperate seamlessly.

## Bring your own tool implementation

You can pass any object that exposes `invoke` or `call`:

```ts
const customTool = {
  name: "weather",
  description: "Lookup weather",
  async invoke({ city }) {
    const data = await fetchWeather(city);
    return { summary: data.description, tempC: data.tempC };
  },
};

const agent = createAgent({ model, tools: [customTool] });
```

## MCP and LangChain tools

Any LangChain `ToolInterface` implementation is supported directly. MCP adapters (e.g. `MultiServerMCPClient.tool()`) produce compatible objects as well – just push them into the `tools` array.

## Context tools (SmartAgent)
- `manage_todo_list` – exposed when `useTodoList: true`. Maintains an explicit plan. The agent must call it first to write a plan, then after every action to update statuses.
- `get_tool_response` – always available. Given an `executionId`, returns the raw output of a tool execution even if the conversation shows a summarized placeholder.
- `response` – added automatically when `outputSchema` is provided. The model must call it exactly once with the final JSON object.

These tools share a mutable state reference so they can read/write `toolHistory`, `toolHistoryArchived`, and plan data without leaking implementation details into your application state.

## Best practices

- Keep tool responsibilities narrow and deterministic.
- Fail fast with informative errors (`throw new Error("MISSING_API_KEY: ...")`).
- Bound payload sizes – return structured summaries, not raw megabyte blobs.
- Include optional metadata (e.g. `source: 'cache'`) to aid downstream reasoning.
- Document latency and rate limits so users can tune `maxParallelTools` appropriately.
