---
title: Structured Output
nav_order: 13
permalink: /structured-output/
---

# Structured Output

Providing an `outputSchema` to `createAgent` or `createSmartAgent` enables deterministic JSON answers backed by Zod. The framework injects a hidden `response` tool, instructs the model to call it exactly once, and returns the parsed value on `result.output`.

## Quick start

```ts
import { createSmartAgent } from "@cognipeer/agent-sdk";
import { z } from "zod";

const Report = z.object({
  title: z.string(),
  bullets: z.array(z.string()).min(1),
});

const agent = createSmartAgent({
  model, // supply your adapter
  tools, // supply your tool list
  outputSchema: Report,
});

const result = await agent.invoke({ messages: [{ role: "user", content: "Give me a 3-bullet recap." }] });

console.log(result.output?.bullets);
```

If the model followed the instructions the `response` tool will be called with a payload that matches the schema. The parsed result is placed at `result.output` and the loop stops immediately.

## Finalize tool expectations

When `outputSchema` is present:

- The system prompt warns the model not to emit final JSON directly.
- The hidden `response` tool is available. It must be called **once** with the final JSON object.
- Returning from that tool sets `ctx.__structuredOutputParsed` and flips `__finalizedDueToStructuredOutput` so the loop exits.

If the model ignores the tool, the framework attempts a fallback by parsing JSON from the final assistant message (fenced code block or first object/array). Parsing errors are swallowed so you can inspect `result.content` manually.

## Accessing the raw message

Even with structured output you still receive the raw message string in `result.content` and the full transcript in `result.messages`. This is helpful when you want to display reasoning or citations alongside parsed data.

## Handling validation failures

When the schema throws, the tool responds with `{ error: 'Schema validation failed', details }`. Common reasons:

- Missing required fields (tighten or relax schema accordingly).
- Strings too short/long for schema constraints.
- The model attempted to return an array when the schema expects an object (or vice versa).

Adjust prompts or schema defaults to reduce validation churn. Including examples in your instruction often helps.

## Combining with planning or summarization

Structured output works seamlessly with planning mode or summarization:

- Planning rules remain enforced; the model must still manage the TODO list while working toward the structured answer.
- Summarization can archive intermediate tool results; the final `response` payload persists in `toolHistory` for auditing.

## Tips

- Keep schemas precise but forgiving enough for the model to satisfy (e.g. allow optional fields when they can be omitted).
- Provide descriptions on schema fields using `z.string().describe(...)` to improve adherence.
- When returning arrays of unknown length, consider bounding them with `.max(n)` so the model does not produce unbounded output.
- For streaming/interactive UIs, render intermediate reasoning from `result.messages` while waiting for the final parsed payload.
