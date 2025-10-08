import { createAgent, createTool } from "@cognipeer/agent-sdk";
import { z } from "zod";

const writeFile = createTool({
  name: "dangerous_write",
  description: "Pretend to write content to disk. Requires human approval before executing.",
  schema: z.object({ path: z.string().min(1), content: z.string().min(1) }),
  needsApproval: true,
  approvalPrompt: "Confirm that the agent is allowed to write the supplied content to the given path.",
  func: async ({ path, content }) => ({ ok: true, path, bytesWritten: Buffer.byteLength(content) }),
});

let turn = 0;
const fakeModel = {
  bindTools() {
    return this;
  },
  async invoke(messages: any[]) {
    turn += 1;
    if (turn === 1) {
      return {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_write_1",
            type: "function",
            function: {
              name: "dangerous_write",
              arguments: JSON.stringify({ path: "./out/release.txt", content: "Release notes" }),
            },
          },
        ],
      };
    }
    const last = messages[messages.length - 1];
    if (last?.role === "tool") {
      const payload = typeof last.content === "string" ? JSON.parse(last.content) : last.content;
      return {
        role: "assistant",
        content: `File write completed at ${payload.path} (${payload.bytesWritten} bytes).`,
      };
    }
    return { role: "assistant", content: "Nothing to do." };
  },
};

const agent = createAgent({
  model: fakeModel as any,
  tools: [writeFile],
  limits: { maxToolCalls: 3 },
});

const first = await agent.invoke({ messages: [{ role: "user", content: "Please write the release notes to disk." }] });

if (!first.state?.ctx?.__awaitingApproval) {
  console.log("No approval needed. Final content:", first.content);
  process.exit(0);
}

const pending = first.state.pendingApprovals?.[0];
if (!pending) {
  throw new Error("Approval flag set but no pending approvals recorded");
}

console.log("Approval required for", pending.toolName, "with args", pending.args);

const approvedState = agent.resolveToolApproval(first.state, {
  id: pending.id,
  approved: true,
  decidedBy: "team-lead",
  comment: "Looks safe to write.",
});

const resumed = await agent.invoke(approvedState);

console.log("Final assistant reply:", resumed.content);
console.log("Approval log:", resumed.state?.pendingApprovals);
