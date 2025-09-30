import type { Message, SmartAgentOptions, SmartState, ToolInterface } from "../types.js";
import { normalizeUsage } from "../utils/usage.js";
import { recordTraceEvent, sanitizeTracePayload, estimatePayloadBytes, getModelName, getProviderName } from "../utils/tracing.js";

// Minimal agent node: no system prompt injection. Invokes model with messages as-is.
export function createAgentCoreNode(opts: SmartAgentOptions) {
  return async (state: SmartState): Promise<Partial<SmartState>> => {
    const runtime = state.agent || {
      name: opts.name,
      version: opts.version,
      model: opts.model,
      tools: (opts.tools as any) || [],
      guardrails: (opts as any).guardrails,
      systemPrompt: undefined,
      limits: opts.limits,
      useTodoList: undefined,
      outputSchema: (opts as any).outputSchema,
      tracing: opts.tracing,
    };

    const tools: Array<ToolInterface<any, any, any>> = (runtime.tools as any) ?? [];
    const modelWithTools = (runtime.model)?.bindTools
      ? (runtime.model).bindTools(tools)
      : runtime.model;

    const traceSession = (state.ctx as any)?.__traceSession;
    const actorName = runtime.name ?? opts.name ?? "agent";
    const actorVersion = runtime.version ?? opts.version;
    const start = Date.now();
    const shouldLogPrompt = !!traceSession && traceSession.resolvedConfig.logData;
    const promptPayload = shouldLogPrompt ? sanitizeTracePayload(state.messages) : undefined;
    const promptBytes = promptPayload !== undefined ? estimatePayloadBytes(promptPayload) : undefined;

    let response: any;
    try {
      response = await modelWithTools.invoke([...state.messages]);
    } catch (err: any) {
      const durationMs = Date.now() - start;
      recordTraceEvent(traceSession, {
        type: "ai_call",
        label: "Assistant Error",
        actor: { scope: "agent", name: actorName, role: "assistant", version: actorVersion },
        status: "error",
        durationMs,
        requestBytes: promptBytes,
        model: getModelName((runtime as any).model || (opts as any).model),
        provider: getProviderName((runtime as any).model || (opts as any).model),
        error: { message: err?.message || String(err), stack: err?.stack },
        messageList: state.messages,
      });
      throw err;
    }
    const messagesWithResponse: Message[] = [
      ...state.messages,
      response as any,
    ];

    // Usage tracking (per-request, aggregated by model)
    const rawUsage = (response as any)?.usage || (response as any)?.response_metadata?.token_usage || (response as any)?.response_metadata?.usage;
    const normalized = normalizeUsage(rawUsage);
    const modelName = getModelName((runtime as any).model || (opts as any).model) || "unknown_model";
    const durationMs = Date.now() - start;

    const shouldLogResponse = !!traceSession && traceSession.resolvedConfig.logData;
    const responsePayload = shouldLogResponse ? sanitizeTracePayload(response) : undefined;
    const responseBytes = responsePayload !== undefined ? estimatePayloadBytes(responsePayload) : undefined;

    recordTraceEvent(traceSession, {
      type: "ai_call",
      label: "Assistant Response",
      actor: { scope: "agent", name: actorName, role: "assistant", version: actorVersion },
      durationMs,
      inputTokens: normalized?.prompt_tokens,
      outputTokens: normalized?.completion_tokens,
      totalTokens: normalized?.total_tokens,
      cachedInputTokens: normalized?.prompt_tokens_details?.cached_tokens,
      requestBytes: promptBytes,
      responseBytes: responseBytes,
      model: modelName,
      provider: getProviderName((runtime as any).model || (opts as any).model),
      messageList: messagesWithResponse,
    });
    if (normalized) {
      const usageState = state.usage || { perRequest: [], totals: {} };
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const turn = usageState.perRequest.length + 1;
      const timestamp = new Date().toISOString();
      const cachedInputTok = normalized.prompt_tokens_details?.cached_tokens;
      usageState.perRequest.push({ id, modelName, usage: normalized, timestamp, turn, cachedInput: cachedInputTok });
      const inputTok = normalized.prompt_tokens;
      const outputTok = normalized.completion_tokens;
      const totalTok = normalized.total_tokens;
      const key = modelName as string;
      const agg = usageState.totals[key] || { input: 0, output: 0, total: 0, cachedInput: 0 };
      usageState.totals[key] = {
        input: agg.input + (Number(inputTok) || 0),
        output: agg.output + (Number(outputTok) || 0),
        total: agg.total + (Number(totalTok) || 0),
        cachedInput: agg.cachedInput + (Number(cachedInputTok) || 0),
      };
      (state as any).usage = usageState;
    }

    return { messages: messagesWithResponse, usage: (state as any).usage };
  };
}
