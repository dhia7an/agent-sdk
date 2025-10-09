
# Nodes

Conceptual phases implemented as simple async functions. Each lives under `agent-sdk/src/nodes` and returns partial state updates.

| Node | File | Responsibility |
|------|------|----------------|
| `resolver` | `nodes/resolver.ts` | Normalize inbound state, seed counters, attach runtime defaults. |
| `agentCore` | `nodes/agentCore.ts` | Bind tools (when supported), invoke the model, append the assistant response, normalize usage. |
| `tools` | `nodes/tools.ts` | Execute proposed tool calls with global/per-turn limits, record history, emit tool events, handle handoffs and structured output finalize signals. |
| `contextSummarize` | `nodes/contextSummarize.ts` | When triggered, archive heavy tool outputs, generate summaries, and emit a synthetic `context_summarize` tool call/response pair. |
| `toolLimitFinalize` | `nodes/toolLimitFinalize.ts` | Inject a system notice when the global tool-call cap is reached so the next turn must answer directly. |

The smart agent orchestrates these nodes in a loop (no external graph runtime). Decision helpers in `graph/decisions.ts` determine when to run summarization before or after tool execution and when to finalize due to limits.

Each node is pure-ish: it only mutates through returned diffs, making them straightforward to unit test and reason about independently.
