import { SmartState, ToolApprovalResolution, PendingToolApproval } from "../types.js";

const cloneApprovals = (approvals: PendingToolApproval[] | undefined) =>
  Array.isArray(approvals) ? approvals.map((entry) => ({ ...entry })) : [];

export function resolveToolApprovalState(state: SmartState, resolution: ToolApprovalResolution): SmartState {
  const approvals = cloneApprovals(state.pendingApprovals);
  const matchIndex = approvals.findIndex((entry) => entry.id === resolution.id || entry.toolCallId === resolution.id);
  if (matchIndex === -1) {
    throw new Error(`Pending approval not found for id: ${resolution.id}`);
  }

  const entry = { ...approvals[matchIndex] };
  if (entry.status === "executed") {
    throw new Error(`Tool approval ${entry.id} already completed.`);
  }

  entry.status = resolution.approved ? "approved" : "rejected";
  entry.approvedArgs = resolution.approved ? (resolution.approvedArgs ?? entry.args) : undefined;
  entry.decidedBy = resolution.decidedBy;
  entry.comment = resolution.comment;
  entry.decidedAt = new Date().toISOString();

  approvals[matchIndex] = entry;

  const ctx = { ...(state.ctx || {}) };
  delete ctx.__awaitingApproval;
  ctx.__resumeStage = "tools";
  ctx.__approvalResolved = { id: entry.id, status: entry.status };

  return {
    ...state,
    pendingApprovals: approvals,
    ctx,
  };
}
