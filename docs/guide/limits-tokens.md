
# Limits and Token Management

## Limit knobs

- **`maxToolCalls`** – total tool executions allowed across the entire invocation. Once reached, additional tool calls are skipped and a finalize message is injected.
- **`maxParallelTools`** – maximum concurrent tool executions per agent turn (default 1). Adjust to balance throughput vs. rate limits.
- **`maxToken`** – estimated token threshold for the *next* agent turn. Exceeding this triggers the summarization node before the model call.
- **`contextTokenLimit`** – desired size of the live transcript after summarization (used as a target, not a hard cap).
- **`summaryTokenLimit`** – target length for each generated summary chunk (defaults to a generous value if omitted).

## Tool limit finalize

When the assistant proposes tool calls but `toolCallCount >= maxToolCalls`, the tools node:
1. Emits `tool_call` events with `phase: "skipped"` for the overflow calls.
2. Appends tool response messages noting the skip.
3. Invokes `toolLimitFinalize`, which injects a system message instructing the model to answer directly.

On the next agent turn, the model sees the finalize notice and must produce a direct assistant response without more tool calls.

## Summarization flow

Summarization is enabled by default for smart agents. It activates when:

```
estimatedTokens(messages) > limits.maxToken
```

Steps:
1. Chunk the transcript while keeping tool call/response pairs together.
2. Summarize each chunk using the configured model.
3. Merge partial summaries iteratively to respect `summaryTokenLimit`.
4. Replace tool responses with `SUMMARIZED executionId:'...'` markers.
5. Move original tool outputs to `toolHistoryArchived`.
6. Add a synthetic assistant/tool pair labelled `context_summarize` containing the merged summary.
7. Emit a `summarization` event and reset `toolHistory` for future runs.

Disable summarization entirely via `summarization: false`. When disabled, `maxToken` is ignored.

## Token heuristics

`countApproxTokens(text)` estimates tokens using `Math.ceil(text.length / 4)`. It avoids provider-specific encoders and keeps the runtime dependency-free. If you need precise counts, pre-truncate content or swap in your own estimation before calling `invoke`.

## Tips

- Return concise tool payloads to minimize summarization churn. Keep raw content accessible via IDs or `get_tool_response`.
- Increase `summaryTokenLimit` if summaries feel too lossy, but note that larger summaries consume more budget.
- For conversations with user-provided long context, consider pre-summarizing or chunking prior to passing into the agent.
- Monitor `summarization` events to visualize how often compaction occurs and whether limits need tuning.
