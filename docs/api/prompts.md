
# Prompts and Planning

`createSmartAgent` calls `buildSystemPrompt` under the hood to compose a system message. You can reuse the helper directly or append extra instructions via options.

## Base prompt construction

```ts
import { buildSystemPrompt } from "@cognipeer/agent-sdk";

const prompt = buildSystemPrompt(
	"Keep answers short and cite sources when available.",
	true,             // planning enabled
	"ResearchHelper" // agent name header
);
```

The generated prompt includes:
- Agent header (`Agent Name: ...`).
- General conduct rules (concise answers, avoid fabrications, ask clarifying questions when needed).
- Optional planning block when `planning = true`.
- `Extra instructions:` section with your custom text (if provided).

## Planning rules

When `useTodoList: true`, the following directives are injected:

1. First action must be a single call to `manage_todo_list` with an ordered plan (even for trivial tasks).
2. After every non-planning tool call, immediately update the plan via `manage_todo_list` (write operation) and attach one-line evidence for the affected item.
3. Keep exactly one item `in-progress`; others must be `not-started` or `completed`.
4. Never expose the plan text or summarize it in assistant messages.
5. If the agent ever responds without writing a plan in the session, it must stop and write the plan first.

These rules are enforced by the prompt and by `manage_todo_list` events. Monitor `plan` events to surface plan changes in your UI.

## Additional instructions

Pass `systemPrompt` to `createSmartAgent` to append more guidance:

```ts
const agent = createSmartAgent({
	model,
	tools,
	useTodoList: false,
	systemPrompt: "Answer using bullet points and cite documentation links when relevant.",
});
```

The text you supply is added verbatim under the `Extra instructions:` section. Keep it concise and declarative.

## Using your own system message

If you want complete control over the system message, prepend it manually when calling `invoke` and set `useTodoList: false` (to avoid duplicate planning rules). The smart agent will detect an existing system message at index 0 and skip inserting another.
