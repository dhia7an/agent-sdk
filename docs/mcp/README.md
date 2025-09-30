---
title: MCP Integration
nav_order: 16
permalink: /mcp/
---

# MCP Integration

This guide shows how to connect Model Context Protocol (MCP) servers to the agent SDK. MCP tools typically expose LangChain-compatible `ToolInterface` objects, so you can reuse them directly with the built-in adapters.

## Prerequisites

- Node.js >= 18
- An MCP server (local or remote) that exposes the tools you want to call
- Optional: `@langchain/core` if you want adapters to emit real LangChain tool instances (the SDK works without it)

Install the packages you need:

```sh
npm install @cognipeer/agent-sdk
npm install @langchain/mcp-adapters
# Optional when reusing LangChain models/tools
npm install @langchain/core @langchain/openai
```

## Step 1: Connect to your MCP server

Use `MultiServerMCPClient` (or another MCP client) to load remote tool definitions. The example below connects to Tavily's hosted MCP server:

```ts
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

const client = new MultiServerMCPClient({
  throwOnLoadError: true,
  prefixToolNameWithServerName: true,
  useStandardContentBlocks: true,
  mcpServers: {
    "tavily-remote-mcp": {
      transport: "stdio",
      command: "npx",
      args: ["-y", "mcp-remote", `https://mcp.tavily.com/mcp/?tavilyApiKey=${process.env.TAVILY_API_KEY}`],
    },
  },
});
```

## Step 2: Convert MCP tools

Convert the returned LangChain tools into lightweight SDK tools with `fromLangchainTools`:

```ts
import { fromLangchainTools } from "@cognipeer/agent-sdk";

const lcTools = await client.getTools();
const tools = fromLangchainTools(lcTools);
```

The wrapper keeps the bridge lazy: if `@langchain/core` is installed the adapter rehydrates LangChain tool instances, otherwise the SDK invokes them through its own contract.

## Step 3: Bind a model (optional adapter)

If you're already using a LangChain chat model, wrap it with `fromLangchainModel` so tool binding happens automatically:

```ts
import { createSmartAgent, fromLangchainModel } from "@cognipeer/agent-sdk";
import { ChatOpenAI } from "@langchain/openai";

const model = fromLangchainModel(new ChatOpenAI({
  model: "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
}));
```

You can supply any object that implements `invoke` directly—LangChain is optional.

## Step 4: Run the agent

```ts
const agent = createSmartAgent({
  name: "MCP Explorer",
  model,
  tools,
  useTodoList: true,
  limits: { maxToolCalls: 10 },
  tracing: { enabled: true },
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "Use Tavily to summarize the latest MCP news." }],
});

console.log(result.content);
```

Remember to close the MCP client when you're done:

```ts
await client.close();
```

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| `Tool not found` errors | Tool names emitted by the model don't match MCP tool names | Enable `prefixToolNameWithServerName` or adjust your prompts to use canonical names. |
| `fromLangchainTools` throws about invocation | The MCP tool lacks `invoke`/`call` implementations | Ensure your MCP client exposes LangChain `ToolInterface` objects (most do) or write a tiny wrapper that forwards to the protocol call. |
| Missing tool descriptions | Some MCP servers omit metadata | Provide contextual instructions in your system prompt describing the available tools. |
| Connection hangs | MCP process expects environment variables | Pass the required env vars in the MCP client configuration. |

## Next steps

- Read `examples/mcp-tavily/README.md` for a runnable walkthrough.
- Combine MCP tools with your own Zod-backed tools in the same agent.
- Enable tracing to capture full tool transcripts and debug remote execution.
