# Planning Example

Demonstrates structured task planning with TODO management.

## Overview

Shows how to enable and use the planning mode for multi-step tasks.

[View full source](https://github.com/Cognipeer/agent-sdk/tree/main/examples/todo-planning)

## Key Features

- Automatic plan creation before actions
- Plan updates after each tool execution
- Plan event monitoring
- Strict workflow enforcement

## Code

```typescript
import { createSmartAgent, createTool } from "@cognipeer/agent-sdk";

const agent = createSmartAgent({
  name: "Planner",
  model,
  tools: [searchTool, analyzeTool, summarizeTool],
  useTodoList: true, // Enable planning
  onEvent: (event) => {
    if (event.type === "plan") {
      console.log(`\n=== Plan v${event.version} ===`);
      event.todoList.forEach((item) => {
        console.log(`[${item.status}] ${item.title}`);
      });
    }
  },
});

const result = await agent.invoke({
  messages: [{
    role: "user",
    content: "Research AI frameworks and create a comparison"
  }],
});
```

## Running

```bash
npm run example:planning
```

## See Also

- [Planning Guide](/guide/planning)
- [State Management](/guide/state-management)
