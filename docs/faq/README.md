---
title: FAQ
nav_order: 12
permalink: /faq/
---

# FAQ

## Why are my tool calls not triggering?
Your model may not support structured tool calls. Try:

- Ensuring your adapter exposes a real `bindTools` implementation (LangChain models already do).
- Wrapping the model with `withTools(model, tools)` as a best-effort fallback.
- Switching to a model that supports OpenAI-style tool calling (e.g. GPT-4o variants).

## When does summarization run?
When `limits.maxToken` would be exceeded before the next model call, the `contextSummarize` node compacts history.

## How do I disable summarization?
It is enabled by default. Pass `summarization: false` to `createSmartAgent({ ... })` to turn it off. When disabled, `limits.maxToken` will not trigger compaction.

## Can I use MCP tools?
Yes. MCP adapter tools can be provided in the `tools` array like any LangChain tool.

## What's the difference between `createAgent` and `createSmartAgent`?
`createAgent` is the minimal loop: no system prompt, no planning helpers, no summaries. `createSmartAgent` adds those features automatically (planning rules, context tools, summarization, optional structured output finalize). Choose the one that matches your orchestration needs.

## Why is my structured output not parsed?
- Ensure `outputSchema` is a Zod schema (or object compatible with `parse`).
- Confirm the model invoked the hidden `response` tool; if it didn’t, inspect the final assistant message and adjust prompting.
- Check the debug log – look for `__structuredOutputParsed` in `ctx` or errors inside tool responses.

## How do I inspect raw tool outputs after summarization?
Call the `get_tool_response` tool with the `executionId` printed in the summarized message (e.g. `SUMMARIZED executionId:'abc123'`). The agent will return the original payload from `toolHistoryArchived`.

## Why do I see “Skipped tool due to tool-call limit”? 
The assistant proposed additional tool calls after hitting `limits.maxToolCalls`. Increase the limit or refine your prompts to encourage earlier final answers. The skip is intentional to force the next turn to respond directly.

## Logs aren't showing up
- Verify `debug: { enabled: true }` was passed.
- If you provided `debug.callback`, no files are written – log inside the callback instead.
- Confirm your process has write access to the working directory when using file output.
