# Multi-Agent Example

Agent composition and delegation patterns.

## Overview

Shows how to compose multiple agents and delegate tasks between them.

[View full source](https://github.com/Cognipeer/agent-sdk/tree/main/examples/multi-agent)

## Patterns

### Agent as Tool

```typescript
const specialist = createSmartAgent({
  name: "Specialist",
  model,
  tools: [domainTool],
});

const coordinator = createSmartAgent({
  name: "Coordinator",
  model,
  tools: [
    specialist.asTool({
      toolName: "consult_specialist",
      toolDescription: "Delegate to domain specialist",
    }),
  ],
});
```

### Runtime Handoff

```typescript
const agent = createSmartAgent({
  model,
  tools,
  handoffs: [specialistAgent.asHandoff()],
});
```

## Running

```bash
npm run example:multi-agent
```

## See Also

- [Core Concepts](/guide/core-concepts)
- [Agent API](/api/agent)
