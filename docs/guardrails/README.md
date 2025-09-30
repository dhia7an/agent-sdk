# Conversation guardrails

Guardrails let you intercept both user inputs and assistant outputs before they reach the model or the caller. Each guardrail bundles one or more **checks** that return a disposition (`allow`, `warn`, `block`).

```ts
import {
  createAgent,
  createRegexGuardrail,
  createCodeGuardrail,
  GuardrailPhase,
} from "@cognipeer/agent-sdk";

const guardrails = [
  createRegexGuardrail(/password|secret/i, {
    guardrailId: "password-filter",
    guardrailTitle: "Sensitive secret filter",
    phases: [GuardrailPhase.Request],
    rule: {
      failureMessage: "Outbound request blocked: secret detected.",
    },
  }),
  createCodeGuardrail({
    guardrailId: "code-ban",
    guardrailTitle: "No raw code",
    phases: [GuardrailPhase.Response],
    rule: { disposition: "block" },
  }),
];

const agent = createAgent({
  model,
  guardrails,
});
```

When a guardrail blocks a request, the agent adds an assistant message summarising the violation and stops before sending content to the model. For responses, the offending assistant turn is replaced with a guardrail notice.

## Built-in checks

| Check | Factory | Description |
| --- | --- | --- |
| Regex pattern | `regexRule` | Blocks (or warns) when a regular expression matches the selected message text. |
| JSON schema | `jsonSchemaRule` | Parses the message as JSON and validates it with either a Zod schema or JSON Schema. |
| Code detection | `codePresenceRule` | Flags messages containing fenced code blocks or common programming keywords. |
| Agent verdict | `agentVerdictRule` | Delegates the decision to another agent that returns structured output. |
| Custom callback | `customCallbackRule` | Runs arbitrary user logic for full control.

Each helper returns a `GuardrailRule` that you can feed into `createGuardrail({ checks: [...] })`. For convenience, preset builders (`createRegexGuardrail`, `createJsonGuardrail`, `createCodeGuardrail`) wrap a single rule into a ready-to-use guardrail.

## Programmatic evaluation

Every invocation stores the aggregated outcome in `result.state?.guardrailResult` and emits `guardrail` events through `onEvent` hooks:

```ts
const result = await agent.invoke({ messages: [...] }, {
  onEvent(event) {
    if (event.type === "guardrail") {
      console.log(`[${event.phase}] ${event.disposition} -> ${event.reason}`);
    }
  },
});

console.log(result.state?.guardrailResult);
```

`GuardrailOutcome` lists all incidents (warnings and blocks) so you can audit or surface them in your product.
