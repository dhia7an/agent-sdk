# Adapters

Agent SDK provides adapters to integrate with popular frameworks and protocols.

## LangChain Adapters

### fromLangchainModel

Wrap LangChain chat models for use with Agent SDK:

```typescript
import { fromLangchainModel } from "@cognipeer/agent-sdk";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";

// OpenAI
const openaiModel = fromLangchainModel(
  new ChatOpenAI({
    model: "gpt-4o-mini",
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0.7,
  })
);

// Anthropic
const anthropicModel = fromLangchainModel(
  new ChatAnthropic({
    model: "claude-3-5-sonnet-20241022",
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
);
```

### fromLangchainTools

Convert LangChain tools to Agent SDK format:

```typescript
import { fromLangchainTools } from "@cognipeer/agent-sdk";
import { DynamicTool } from "@langchain/core/tools";

const langchainTools = [
  new DynamicTool({
    name: "search",
    description: "Search the web",
    func: async (query: string) => {
      // Search implementation
      return `Results for: ${query}`;
    },
  }),
];

const sdkTools = fromLangchainTools(langchainTools);

const agent = createSmartAgent({
  model,
  tools: sdkTools,
});
```

### withTools

Helper to bind tools to models that support it:

```typescript
import { withTools, fromLangchainModel } from "@cognipeer/agent-sdk";
import { ChatOpenAI } from "@langchain/openai";

const model = fromLangchainModel(new ChatOpenAI({ model: "gpt-4o-mini" }));
const tools = [searchTool, calculatorTool];

// Automatically binds tools if model supports bindTools()
const modelWithTools = withTools(model, tools);
```

## MCP (Model Context Protocol)

### MCP Client Adapter

Connect to MCP servers and use their tools:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { fromLangchainTools } from "@cognipeer/agent-sdk";

// Create MCP client
const transport = new StdioClientTransport({
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-tavily"],
  env: { TAVILY_API_KEY: process.env.TAVILY_API_KEY },
});

const client = new Client(
  { name: "agent-sdk-client", version: "1.0.0" },
  { capabilities: {} }
);

await client.connect(transport);

// List and convert MCP tools
const mcpTools = await client.listTools();
const tools = fromLangchainTools(
  mcpTools.tools.map(tool => ({
    name: tool.name,
    description: tool.description,
    schema: tool.inputSchema,
    func: async (args: any) => {
      const result = await client.callTool({ name: tool.name, arguments: args });
      return result.content;
    },
  }))
);

// Use with agent
const agent = createSmartAgent({
  model,
  tools,
});
```

For complete MCP integration examples, see the [MCP Guide](/guide/mcp).

## Custom Model Adapter

Create your own model adapter for any LLM provider:

```typescript
import { ModelAdapter, Message, AssistantMessage } from "@cognipeer/agent-sdk";

class CustomModelAdapter implements ModelAdapter {
  constructor(private apiKey: string, private model: string) {}

  async invoke(messages: Message[]): Promise<AssistantMessage> {
    // Convert messages to your API format
    const response = await fetch("https://api.example.com/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    const data = await response.json();

    // Return in Agent SDK format
    return {
      role: "assistant",
      content: data.message.content,
      // Optional: include tool calls if supported
      tool_calls: data.tool_calls,
    };
  }

  // Optional: support tool binding
  bindTools(tools: ToolInterface[]): ModelAdapter {
    return new CustomModelAdapter(this.apiKey, this.model);
  }
}

// Usage
const model = new CustomModelAdapter(
  process.env.CUSTOM_API_KEY,
  "custom-model-v1"
);

const agent = createSmartAgent({ model, tools });
```

## Usage Converter

Customize how usage data is extracted and normalized:

```typescript
import { UsageConverter } from "@cognipeer/agent-sdk";

const customUsageConverter: UsageConverter = (
  finalMessage,
  fullState,
  model
) => {
  // Extract usage from provider-specific format
  const usage = finalMessage.usage_metadata || finalMessage.usage;
  
  return {
    input_tokens: usage?.input_tokens || 0,
    output_tokens: usage?.output_tokens || 0,
    total_tokens: usage?.total_tokens || 0,
    // Provider-specific fields
    cache_hits: usage?.cache_hits,
    reasoning_tokens: usage?.reasoning_tokens,
  };
};

const agent = createSmartAgent({
  model,
  tools,
  usageConverter: customUsageConverter,
});
```

## Best Practices

### Model Selection

- Use **gpt-4o-mini** for most tasks (fast, cost-effective)
- Use **gpt-4** for complex reasoning
- Use **claude-3-5-sonnet** for long context windows

### Tool Binding

- Use `withTools()` for models that support native tool binding
- Models without tool binding will receive tools in system prompt

### Error Handling

```typescript
try {
  const result = await agent.invoke({ messages });
} catch (error) {
  if (error.message.includes("rate limit")) {
    // Handle rate limiting
  } else if (error.message.includes("context length")) {
    // Handle token limits
  }
}
```

### Provider-Specific Configuration

```typescript
// OpenAI with streaming
const model = fromLangchainModel(
  new ChatOpenAI({
    model: "gpt-4o-mini",
    streaming: true,
    callbacks: [/* streaming callbacks */],
  })
);

// Anthropic with system prompt
const model = fromLangchainModel(
  new ChatAnthropic({
    model: "claude-3-5-sonnet-20241022",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  })
);
```

## See Also

- [MCP Integration Guide](/guide/mcp) - Complete MCP setup
- [Tool Development](/guide/tool-development) - Creating custom tools
- [Agent API](/api/agent) - Agent configuration options
