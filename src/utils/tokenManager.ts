import { countApproxTokens } from "./utilTokens.js";
import { Message } from "../types.js";

export type TokenLimits = {
  contextTokenLimit: number;
  summaryTokenLimit: number;
};

export async function applyTokenLimits({
  state,
  limits,
}: {
  state: { messages: Message[]; summaries?: string[] };
  limits: {
    contextTokenLimit: number;
    summaryTokenLimit: number;
  };
}) {
  const messages = state.messages || [];
  const budget = limits.contextTokenLimit;
  let total = messages.reduce((acc, m) => acc + countApproxTokens(String((m as any).content || "")), 0);
  if (total <= budget) return state;

  const newMessages: Message[] = [...messages];

  return { ...state, messages: newMessages };
}
