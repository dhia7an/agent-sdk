---
title: API
nav_order: 5
permalink: /api/
---

# API

## Exported helpers

| Function | Purpose |
|----------|---------|
| `createSmartAgent(options)` | Smart wrapper with system prompt, planning tools, summarization, and structured output finalize support. |
| `createAgent(options)` | Minimal loop without system prompt or summarization. |
| `createSmartTool({ name, description?, schema, func })` | Convenience helper for Zod-backed tools (returns LangChain-compatible `Tool`). |
| `createTool({ ... })` | Alias of `createSmartTool` kept for migration. |
| `fromLangchainModel(model)` | Adapter for LangChain `ChatModel` / `Runnable` objects. |
| `withTools(model, tools)` | Best-effort helper to bind tools to a model that exposes `bindTools`. |
| `buildSystemPrompt(extra?, planning?, name?)` | Compose the built-in system prompt with optional additional instructions. |
| `contextTools.ts` | Factory for built-in tools (`manage_todo_list`, `get_tool_response`, optional `response`). |
| `nodes/*` | Individual node factories (resolver, agentCore, tools, contextSummarize, toolLimitFinalize). |
| `utils/*` | Token heuristics, usage normalization, debug logging helpers. |
| `types.ts` | Full TypeScript surface: `SmartAgentOptions`, `SmartState`, `AgentInvokeResult`, events, etc. |

## Options

`createSmartAgent` and `createAgent` accept `SmartAgentOptions` (aliases: `AgentOptions`). Key fields:

- `model` *(required)* – object with `invoke(messages[]) => assistantMessage`; optional `bindTools(tools)` method.
- `tools?: ToolInterface[]` – Zod tools, LangChain `ToolInterface`, MCP adapters, or any object with `invoke`/`call`.
- `limits?: SmartAgentLimits` – limit configuration:
	- `maxToolCalls?`
	- `maxParallelTools?`
	- `maxToken?` (summarization trigger threshold)
	- `contextTokenLimit?`
	- `summaryTokenLimit?` (or `summary_token_limit` alias)
- `useTodoList?: boolean` – enable planning mode & `manage_todo_list` tool.
- `summarization?: boolean` – default `true`; set `false` to disable summarization entirely.
- `systemPrompt?: string` – additional message appended inside the smart prompt (ignored by `createAgent`).
- `outputSchema?: ZodSchema` – enables structured output finalize tool + parsed `result.output`.
- `handoffs?: HandoffDescriptor[]` – pre-configured agent handoffs exposed as tools.
- `usageConverter?: (finalMessage, fullState, model) => any` – override usage normalization.
- `debug?: { enabled: boolean; path?: string; callback?: (entry) => void }` – Markdown logs and/or callback hook.
- `onEvent?: (event: SmartAgentEvent) => void` – global event listener (per-invoke listener can override).

### SmartAgent-specific behavior

When using `createSmartAgent`:

- A system message is automatically injected (unless one already exists) using `buildSystemPrompt`.
- Context tools (`manage_todo_list`, `get_tool_response`, and `response` when `outputSchema` is set) are appended to the provided tool list.
- Summarization decisions run before and after tool execution when `limits.maxToken` is exceeded.

`createAgent` skips all of the above and simply wires resolver → agentCore → tools → toolLimitFinalize in a loop.

## Return shape

`invoke(input, config?)` resolves to an `AgentInvokeResult<TOutput>`:

```ts
type AgentInvokeResult<TOutput = unknown> = {
	content: string;              // final assistant message string
	output?: TOutput;             // parsed JSON when outputSchema provided
	metadata: { usage?: any };    // raw provider usage (normalized) if available
	messages: Message[];          // full conversation history
	state?: SmartState;           // final agent state (includes tool history, summaries, usage, etc.)
};
```

Pass `config.onEvent` to receive structured events during the invocation (overrides the option-level listener if provided).

## Events

`SmartAgentEvent` union includes:

- `tool_call` – `{ phase: 'start' | 'success' | 'error' | 'skipped', name, id?, args?, result?, error?, durationMs? }`
- `plan` – `{ source: 'manage_todo_list' | 'system', todoList?, operation?, version? }`
- `summarization` – `{ summary, archivedCount? }`
- `metadata` – `{ usage?, modelName?, limits? }` emitted after each agent turn.
- `handoff` – `{ from?, to?, toolName }`
- `finalAnswer` – `{ content }` emitted after the final assistant message.

Subscribe via:

```ts
await agent.invoke(state, {
	onEvent: (event) => {
		if (event.type === "tool_call") console.log(event);
	}
});
```

## Usage normalization

`normalizeUsage(rawUsage)` attempts to reconcile provider-specific shapes into:

```ts
{
	prompt_tokens,
	completion_tokens,
	total_tokens,
	prompt_tokens_details: { cached_tokens, audio_tokens },
	completion_tokens_details: {
		reasoning_tokens,
		audio_tokens,
		accepted_prediction_tokens,
		rejected_prediction_tokens,
	},
	raw,
}
```

Usage is stored on `state.usage.perRequest` (one entry per agent turn) and aggregated in `state.usage.totals` keyed by model name.

## Adapters

`fromLangchainModel` duck-types LangChain chat models and runnables. It handles:

- Mapping internal `Message` objects to LangChain message structures.
- Calling `lcModel.invoke(messages)`.
- Rewrapping the result back into `{ role, content, tool_calls, usage }`.
- Binding tools by deferring to `lcModel.bindTools` when available.

If you prefer raw SDKs (OpenAI, Anthropic, etc.), implement a small object with `invoke` yourself – no additional helpers required.
