# Planning & TODOs

Agent SDK includes a powerful planning mode that helps manage complex multi-step tasks through structured TODO management.

## Overview

When you enable `useTodoList: true`, the smart agent gains access to a special `manage_todo_list` tool that enforces disciplined planning workflows. This is particularly useful for:

- Complex multi-step tasks that require breaking down into subtasks
- Tasks where order of operations matters
- Scenarios requiring checkpoints and progress tracking
- Long-running operations that benefit from structured plans

## Enabling Planning Mode

```typescript
import { createSmartAgent } from "@cognipeer/agent-sdk";

const agent = createSmartAgent({
  model,
  tools,
  useTodoList: true, // Enable planning mode
});
```

## How It Works

### 1. Initial Planning

When planning is enabled, the agent must create a plan before taking any action:

```typescript
const result = await agent.invoke({
  messages: [{
    role: "user",
    content: "Research the top 3 AI frameworks and compare their features"
  }],
});
```

The agent will:
1. Call `manage_todo_list` to create an initial plan
2. Break down the request into actionable items
3. Mark one item as `in-progress`
4. Execute tools to complete each item
5. Update the plan after each action

### 2. Plan Structure

Each TODO item has:
- **id**: Unique identifier
- **title**: Short description (3-7 words)
- **description**: Detailed context and requirements
- **status**: `not-started`, `in-progress`, or `completed`

### 3. Strict Workflow Rules

The planning system enforces these rules:

1. **Plan First**: Must create a plan before any other tool execution
2. **Update After Action**: Must update plan after every tool call
3. **Single In-Progress**: Keep exactly one item `in-progress` at a time
4. **Evidence Required**: Attach brief evidence when marking items complete
5. **No Plan Exposure**: Never include plan text in assistant messages

## Monitoring Plans

Listen to plan events to track progress:

```typescript
const agent = createSmartAgent({
  model,
  tools,
  useTodoList: true,
  onEvent: (event) => {
    if (event.type === "plan") {
      console.log("Plan updated:");
      console.log(`Version: ${event.version}`);
      console.log(`Items: ${event.todoList.length}`);
      event.todoList.forEach(item => {
        console.log(`  [${item.status}] ${item.title}`);
      });
    }
  },
});
```

## Benefits

- **Transparency**: See exactly what the agent plans to do
- **Control**: Intervene or approve before actions execute
- **Traceability**: Track which steps succeeded or failed
- **Resumability**: Resume from where the agent left off
- **Debugging**: Understand agent reasoning and decision-making

## Example: Multi-Step Research

```typescript
const agent = createSmartAgent({
  name: "Researcher",
  model,
  tools: [searchTool, analyzeTool, summarizeTool],
  useTodoList: true,
});

const result = await agent.invoke({
  messages: [{
    role: "user",
    content: "Research recent developments in quantum computing and create a summary"
  }],
});

// Agent creates plan:
// 1. [in-progress] Search for quantum computing news
// 2. [not-started] Analyze top 5 results
// 3. [not-started] Create structured summary
// 4. [not-started] Validate sources

// After each step, plan is updated automatically
```

## Advanced: Custom Plan Prompts

You can customize planning behavior by providing additional instructions:

```typescript
const agent = createSmartAgent({
  model,
  tools,
  useTodoList: true,
  systemPrompt: `
    When creating plans:
    - Break tasks into 3-5 items maximum
    - Include estimated time for each step
    - Prioritize data validation
  `,
});
```

## Best Practices

1. **Use for Complex Tasks**: Planning overhead makes sense for multi-step operations
2. **Monitor Events**: Track plan updates to understand agent behavior
3. **Test Resumability**: Ensure plans work with pause/resume workflows
4. **Limit Plan Size**: Keep plans focused (3-7 items typically)
5. **Clear Descriptions**: Provide detailed task descriptions for better planning

## See Also

- [State Management](/guide/state-management) - Pause and resume with plans
- [Tool Approvals](/guide/tool-approvals) - Combine planning with human approval
- [Debugging](/guide/debugging) - Trace plan execution
