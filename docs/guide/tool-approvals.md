
# Tool Approvals (Human-in-the-Loop)

Some tool calls need a human to confirm inputs before they execute—think payments, deployments, or data export. This page explains how to integrate human-in-the-loop approvals with the Smart Agent runtime.

## Enabling approvals on a tool

Set `needsApproval: true` when creating a tool. Optionally include UI hints:

```ts
const deploy = createTool({
  name: "deploy_service",
  description: "Roll out the current build to production",
  schema: z.object({ version: z.string() }),
  needsApproval: true,
  approvalPrompt: "Send build {{version}} to prod?",
  approvalDefaults: { channel: "ops", priority: "high" },
  async func({ version }) {
    return rollout(version);
  },
});
```

Once selected by the model, the agent will:

1. Append a `pendingApprovals` entry to the state.
2. Emit a `tool_approval` event with `status: "pending"`.
3. Pause execution until the approval is resolved.

## Inspecting `pendingApprovals`

Each entry contains all the data you need to render a review form:

```ts
{
  id: "approve_deploy_1",
  createdAt: "2025-10-08T11:24:33.120Z",
  toolName: "deploy_service",
  toolCallId: "call_abc",
  args: { version: "1.4.2" },
  metadata: {
    prompt: "Send build 1.4.2 to prod?",
    defaults: { channel: "ops", priority: "high" }
  }
}
```

You can serialize the whole state (using `agent.snapshot`) and surface the approval queue in your app or dashboard.

## Resolving an approval

Call `agent.resolveToolApproval` with the original state and the decision:

```ts
const decision = await agent.resolveToolApproval(state, {
  id: pending.id,
  approved: true,
  decidedBy: "on-call",
  comment: "Go for it",
  approvedArgs: { ...pending.args, dryRun: false },
});

const resumed = await agent.invoke(decision);
```

- `approved: true` – the tool executes immediately on the next turn.
- `approved: false` – the tool is skipped; the agent receives a rejection message.
- `approvedArgs` (optional) – override arguments before execution.

## Coordinating with `onStateChange`

Pair approvals with `onStateChange` checkpoints to pause at the right moment:

```ts
const result = await agent.invoke(state, {
  onStateChange(current) {
    if (current.ctx?.__awaitingApproval) return true; // capture snapshot
    return false;
  },
  checkpointReason: "awaiting-human-approval",
});
```

This ensures the run returns immediately after the approval is queued, letting you persist the checkpoint and resume once a reviewer acts.

## Event stream integration

Approvals emit structured events you can feed into telemetry pipelines:

- `status: "pending"` – tool call is waiting for review.
- `status: "approved"` – reviewer green-lit the call.
- `status: "rejected"` – reviewer blocked the call.

Inside the event payload you’ll find `toolName`, `toolCallId`, and the `id` you need to resolve the approval later.

## Recommended UX flow

1. **Detect pause** – `onStateChange` or direct state inspection shows `ctx.__awaitingApproval`.
2. **Display review card** – render `toolName`, arguments, prompt, and metadata.
3. **Collect decision** – allow reviewers to tweak arguments or annotate decisions.
4. **Resolve + resume** – call `resolveToolApproval`; optionally re-run with `agent.resume` if you persisted a snapshot.

> Need a full working example? Check `examples/tool-approval/tool-approval.ts` for end-to-end wiring.

For deeper internals, see the [Tool Development](../tool-development/) guide. To combine approvals with checkpoints and resumable runs, continue with [State Management](../state-management/).
