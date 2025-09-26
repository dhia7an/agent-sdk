---
title: Debugging & Logs
nav_order: 10
permalink: /debugging/
---

# Debugging and Logs

Pass `debug: { enabled: true }` when creating the agent to capture rich Markdown traces.

## Log output

Each invocation creates a directory `logs/<ISO_TIMESTAMP>/` containing step-indexed Markdown files. Every file includes:

- Model name and invocation timestamp.
- Limit configuration for the run.
- Raw usage payload (if provided by the model) and aggregated totals.
- Serialized tool definitions (names, descriptions, schemas).
- Full message timeline grouped by role (system, user, assistant, tool, summarize).

This format is designed for quick human inspection and works well with git diffs when comparing runs.

## Intercepting logs programmatically

Provide a `callback` instead of writing to disk:

```ts
const agent = createSmartAgent({
	model,
	tools,
	debug: {
		enabled: true,
		callback(entry) {
			console.log(`log step #${entry.stepIndex}`, entry.fileName);
			// entry.markdown contains the full report
			// entry.messages exposes the raw Message[] for custom visualization
		},
	},
});
```

When `callback` is set, no files are written – you decide where to persist or render the payload.

## Tips

- Pair logs with `onEvent` to build streaming CLIs or dashboards.
- Include summarized tool outputs in your UI (the logs show execution IDs you can feed back into `get_tool_response`).
- Rotate or clean the `logs/` directory periodically if you run many invocations; the files are safe to delete.
