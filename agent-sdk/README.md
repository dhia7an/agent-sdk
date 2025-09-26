# @cognipeer/agent-sdk

Composable, message-first agent runtime with token-aware summarization, optional planning, and tool debugging baked in. Ships both ESM and CJS builds with full TypeScript types. LangChain is fully optional via a duck-typed adapter.

## Features

- **Transparent tool turns** – assistant tool calls and tool responses live in `state.messages` so transcripts stay debuggable.
- **Summarization pipeline** – large tool outputs are archived with reversible execution IDs; summaries keep context under token budgets.
- **Planning mode** – enable `useTodoList` to expose the `manage_todo_list` tool and strict system prompt rules.
- **Structured output** – pass a Zod schema to add a hidden `response` finalize tool and receive parsed JSON on `result.output`.
- **Multi-agent composition** – reuse agents via `asTool` or transfer control mid-run via `asHandoff`.
- **Usage normalization** – provider usage blobs are normalized and aggregated per model turn.
- **Rich logging** – enable `debug.enabled` to emit Markdown snapshots under `logs/` or intercept them via `debug.callback`.

## Install

```sh
npm install @cognipeer/agent-sdk zod
# optional peers for quick starts
npm install @langchain/core @langchain/openai
```

`@langchain/core` is marked as an optional peer dependency – install it if you plan to use LangChain tools or models.

## Usage

### ESM quick start

```ts
import { createSmartAgent, createSmartTool, fromLangchainModel } from "@cognipeer/agent-sdk";
import { ChatOpenAI } from "@langchain/openai";
import { z } from "zod";

const echo = createSmartTool({
  name: "echo",
  description: "Echo back the input text",
  schema: z.object({ text: z.string().min(1) }),
  func: async ({ text }) => ({ echoed: text }),
});

const model = fromLangchainModel(new ChatOpenAI({
  model: "gpt-4o-mini",
  apiKey: process.env.OPENAI_API_KEY,
}));

const agent = createSmartAgent({
  model,
  tools: [echo],
  limits: { maxToolCalls: 5, maxToken: 6000 },
  useTodoList: true,
});

const result = await agent.invoke({
  messages: [{ role: "user", content: "Plan a greeting and deliver it via the echo tool" }],
});

console.log(result.content);
```

### Custom adapters

The runtime only requires `invoke(messages[]) => assistantMessage` and (optionally) `bindTools()`. To use a bespoke SDK, wrap it:

```ts
const model = {
  async invoke(messages) {
    const payload = messages.map(m => ({ role: m.role, content: m.content }));
    const response = await myClient.chat({ messages: payload });
    return { role: "assistant", content: response.output, tool_calls: response.tool_calls };
  },
  bindTools(tools) {
    this._tools = tools;
    return this;
  }
};

const agent = createAgent({ model, tools: [...], limits: { maxToolCalls: 3 } });
```

### Vision / multimodal input

Messages can contain OpenAI-style content parts:

```ts
await agent.invoke({
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Describe this image" },
      { type: "image_url", image_url: { url: "https://example.com/cat.jpg", detail: "low" } },
    ],
  }],
});
```

### CommonJS

```js
const { createSmartAgent, createTool, fromLangchainModel } = require("@cognipeer/agent-sdk");
const { ChatOpenAI } = require("@langchain/openai");
const { z } = require("zod");

const echo = createTool({
  name: "echo",
  schema: z.object({ text: z.string().min(1) }),
  func: async ({ text }) => ({ echoed: text }),
});

const model = fromLangchainModel(new ChatOpenAI({ model: "gpt-4o-mini", apiKey: process.env.OPENAI_API_KEY }));
const agent = createSmartAgent({ model, tools: [echo] });

agent.invoke({ messages: [{ role: "user", content: "say hi via echo" }] }).then(res => {
  console.log(res.content);
});
```

## API overview

Exports from `dist/index.*`:

- `createSmartAgent(options)` – smart wrapper with system prompt, planning tools, summarization.
- `createAgent(options)` – minimal loop without system prompt or summarization.
- `createSmartTool({ name, description?, schema, func })` – helper for Zod-backed tools.
- `createTool(...)` – alias kept for migration.
- `fromLangchainModel(model)` – duck-type adapter for LangChain `ChatModel` / `Runnable` objects.
- `withTools(model, tools)` – best-effort tool binding helper.
- `buildSystemPrompt(extra?, planning?, name?)` – construct the internal system prompt.
- Node factories (`nodes/*`), context helpers, token utilities, and full TypeScript types (`SmartAgentOptions`, `SmartState`, `AgentInvokeResult`, etc.).

### SmartAgentOptions highlights

- `model`: required chat model adapter (must expose `invoke`).
- `tools`: array of tool implementations (LangChain `Tool`, MCP adapters, or plain objects implementing `invoke`/`call`).
- `limits`: `{ maxToolCalls?, maxParallelTools?, maxToken?, contextTokenLimit?, summaryTokenLimit? }`.
- `useTodoList`: enable planning rules and `manage_todo_list` tool.
- `summarization`: set to `false` to disable summarization entirely.
- `outputSchema`: Zod schema for structured output parse + finalize tool.
- `usageConverter`: hook to normalize provider-specific usage shapes.
- `debug`: `{ enabled: boolean, path?, callback? }` for Markdown logs.
- `onEvent`: receive `tool_call`, `plan`, `summarization`, `metadata`, `handoff`, and `finalAnswer` events per invoke.

### Structured output finalize

When `outputSchema` is provided, the framework injects a hidden `response` tool. The model is instructed (via system prompt) to call it exactly once with the final JSON object. Parsed output appears on `result.output` and the loop stops automatically.

### Summarization internals

- Token estimates use a lightweight `countApproxTokens` heuristic (~4 chars per token).
- When the next model turn would exceed `limits.maxToken`, the contextSummarize node chunk-summarizes tool responses into concise briefs while archiving originals in `state.toolHistoryArchived`.
- `get_tool_response` lets the model request the raw payload later using `executionId`.

## Debugging

Enable logging with `debug.enabled: true`. By default Markdown files are written to `logs/<ISO_TIMESTAMP>/` containing:

- Model name, invocation limits, and raw usage (if reported).
- Serialized tool schemas.
- Message timeline with assistant/tool turns.

Provide `debug.callback` to receive the same payload programmatically (no files written).

## Build

`tsup` bundles to `dist/index.js` (ESM) and `dist/index.cjs` (CJS) with declarations. Run:

```sh
npm install
npm run build
```

`prepublishOnly` also performs a build to keep the published artifact fresh.

## License

MIT

---

LangChain remains an optional peer – install it only if you need its tools or models. The core runtime has no hard dependency on LangChain message classes or graph libraries.
