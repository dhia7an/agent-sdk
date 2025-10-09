
# Tools

## createTool

Define tools quickly with a Zod schema and an async function.

```ts
import { createTool } from "@cognipeer/agent-sdk";
import { z } from "zod";

const search = createTool({
  name: "search",
  description: "Simple search",
  schema: z.object({ q: z.string() }),
  func: async ({ q }) => ({ results: [`You searched: ${q}`] }),
});
```

Under the hood the helper yields a lightweight internal tool object. It remains duck-typed so LangChain adapters (and other ecosystems) can still interoperate once converted via adapter helpers.

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

Any LangChain `ToolInterface` implementation is supported after converting through `fromLangchainTools(...)`. MCP adapters (e.g. `MultiServerMCPClient.tool()`) produce LangChain-style tools, so wrap them first:

```ts
import { fromLangchainTools } from "@cognipeer/agent-sdk";

const lcTools = await client.getTools();
const tools = fromLangchainTools(lcTools);
```

When using `fromLangchainModel(...)`, tools passed to the agent are automatically bridged back to LangChain (if `@langchain/core` is installed); otherwise the agent falls back to plain callables.

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
