// LangChain specific types are removed from core; we define lightweight internal shapes.
// If the user uses LangChain, they can still pass LC message objects; we treat them opaquely.
import type { ZodSchema } from "zod";

// Image and content part types for multimodal messages
export type ImageURL =
  | { url: string; detail?: 'auto' | 'low' | 'high' }
  | { base64: string; media_type?: string; detail?: 'auto' | 'low' | 'high' }
  | string;

export type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: ImageURL }
  | { type: string; [key: string]: any };

// Generic tool interface minimal contract (duck-typed). If user passes a LangChain Tool it will satisfy this.
export interface ToolInterface<TInput = any, TOutput = any, TCallOptions = any> {
  name: string;
  description?: string;
  // Either invoke(arg) or call(arg)
  invoke?: (input: TInput, config?: TCallOptions) => Promise<TOutput> | TOutput;
  call?: (input: TInput, config?: TCallOptions) => Promise<TOutput> | TOutput;
  schema?: any; // optional JSON schema / zod inference
  [key: string]: any;
}

export type RunnableConfig = { [key: string]: any };

// Base message (internal) – we accept either string content or array parts.
export type BaseMessage = {
  role: string; // 'user' | 'assistant' | 'system' | 'tool' | etc.
  name?: string;
  content: string | ContentPart[];
  tool_calls?: any;
  tool_call_id?: string;
  [key: string]: any;
};

// AI message is any message with role=assistant; keep alias for usageConverter generics
export type AIMessage = BaseMessage & { role: 'assistant' };

export type Message = BaseMessage; // maintain alias used elsewhere

export enum GuardrailPhase {
  Request = "request",
  Response = "response",
}

export type GuardrailDisposition = "block" | "warn" | "allow";

export type GuardrailContext = {
  phase: GuardrailPhase;
  messages: Message[];
  latestMessage?: Message;
  state: SmartState;
  runtime?: AgentRuntimeConfig;
  options: SmartAgentOptions;
};

export type GuardrailRuleResult = {
  passed: boolean;
  reason?: string;
  details?: Record<string, any>;
  disposition?: GuardrailDisposition;
};

export type GuardrailRule = {
  id?: string;
  title?: string;
  description?: string;
  evaluate: (
    context: GuardrailContext
  ) => Promise<GuardrailRuleResult> | GuardrailRuleResult;
  metadata?: Record<string, any>;
};

export type GuardrailIncident = {
  guardrailId?: string;
  guardrailTitle?: string;
  ruleId?: string;
  ruleTitle?: string;
  phase: GuardrailPhase;
  reason?: string;
  details?: Record<string, any>;
  disposition: GuardrailDisposition;
};

export type ConversationGuardrail = {
  id?: string;
  title?: string;
  description?: string;
  appliesTo: GuardrailPhase[];
  rules: GuardrailRule[];
  haltOnViolation?: boolean;
  onViolation?: (
    incident: GuardrailIncident,
    context: GuardrailContext
  ) => Promise<GuardrailDisposition | void> | GuardrailDisposition | void;
  metadata?: Record<string, any>;
};

export type GuardrailOutcome = {
  ok: boolean;
  incidents: GuardrailIncident[];
};

export type SmartAgentLimits = {
  maxToolCalls?: number;
  toolOutputTokenLimit?: number;
  contextTokenLimit?: number;
  summaryTokenLimit?: number;
  // Back-compat snake_case alias; if provided, used as summary token limit
  summary_token_limit?: number;
  // If provided, before the next agent call we will estimate the token length
  // of the upcoming AI input with tiktoken and, if it exceeds this limit,
  // we will trigger a summarization pass over prior tool calls/responses.
  maxToken?: number;
  // Maximum number of tools to execute in parallel per turn
  maxParallelTools?: number;
};

export type TraceSinkFileConfig = {
  type: "file";
  path?: string;
};

export type TraceSinkCustomConfig = {
  type: "custom";
  onEvent?: (event: TraceEventRecord) => void | Promise<void>;
  onSession?: (session: TraceSessionFile) => void | Promise<void>;
};

export type TraceSinkCognipeerConfig = {
  type: "cognipeer";
  apiKey: string;
  url?: string;
};

export type TraceSinkHttpConfig = {
  type: "http";
  url: string;
  headers?: Record<string, string>;
};

export type TraceSinkConfig =
  | TraceSinkFileConfig
  | TraceSinkCustomConfig
  | TraceSinkCognipeerConfig
  | TraceSinkHttpConfig;

export type SmartAgentTracingConfig = {
  enabled: boolean;
  logData?: boolean;
  sink?: TraceSinkConfig;
};

export type SmartAgentOptions = {
  // Human-friendly agent name used in prompts and logging
  name?: string;
  version?: string;
  model: any; // A BaseChatModel-like object with invoke(messages[]) => assistant message
  // Accept any tool implementation matching minimal ToolInterface (LangChain Tool compatible)
  tools?: Array<ToolInterface<any, any, any>>;
  // Optional guard layer descriptors to evaluate before sending requests and after receiving responses
  guardrails?: ConversationGuardrail[];
  // Predefined handoff targets exposed as tools automatically
  handoffs?: HandoffDescriptor<any, any, any>[];
  limits?: SmartAgentLimits;
  // Toggle token-aware context summarization. Default: true. Set to false to disable.
  summarization?: boolean;
  // System prompt configuration
  systemPrompt?: string; // Plain string system prompt to append to defaults
  // Enable internal planning workflow (todo list tool + prompt hints)
  useTodoList?: boolean;
  // Optional: normalize provider-specific usage into a common shape
  usageConverter?: (finalMessage: AIMessage, fullState: SmartState, model: any) => any;
  // Optional Zod schema for structured output; when provided, invoke() will attempt to parse
  // the final assistant content as JSON and validate it. Parsed value is returned as result.output
  // with full TypeScript inference.
  outputSchema?: ZodSchema<any>;
  tracing?: SmartAgentTracingConfig;
};

// Runtime representation of an agent (used inside state.agent)
export type AgentRuntimeConfig = {
  name?: string;
  version?: string;
  model: any;
  tools: Array<ToolInterface<any, any, any>>;
  guardrails?: ConversationGuardrail[];
  systemPrompt?: string;
  limits?: SmartAgentLimits;
  useTodoList?: boolean;
  outputSchema?: ZodSchema<any>;
  tracing?: SmartAgentTracingConfig;
};

export type TraceMessageSection = {
  id?: string;
  kind: "message";
  label: string;
  role: string;
  content: string;
  metadata?: Record<string, any>;
};

export type TraceToolCallSection = {
  id?: string;
  kind: "tool_call";
  label: string;
  tool: string;
  arguments?: any;
};

export type TraceToolResultItem = {
  title?: string;
  url?: string;
  snippet?: string;
  [key: string]: any;
};

export type TraceToolResultSection = {
  id?: string;
  kind: "tool_result";
  label: string;
  tool: string;
  summary?: string;
  items?: TraceToolResultItem[];
  output?: any;
};

export type TraceToolResponseSection = {
  id?: string;
  kind: "tool_response";
  label: string;
  tool: string;
  summary?: string;
  items?: TraceToolResultItem[];
  output?: any;
};

export type TraceSummarySection = {
  id?: string;
  kind: "summary";
  label: string;
  content: string;
};

export type TraceMetadataSection = {
  id?: string;
  kind: "metadata";
  label: string;
  data: Record<string, any>;
};

export type TraceDataSection =
  | TraceMessageSection
  | TraceToolCallSection
  | TraceToolResultSection
  | TraceToolResponseSection
  | TraceSummarySection
  | TraceMetadataSection;

export type TraceEventRecord = {
  sessionId: string;
  id: string;
  type: string;
  label: string;
  sequence: number;
  timestamp: string;
  actor?: { scope?: string; name?: string; role?: string; version?: string };
  status: "success" | "error" | "skipped" | "retry";
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedInputTokens?: number;
  requestBytes?: number;
  responseBytes?: number;
  model?: string;
  provider?: string;
  toolExecutionId?: string;
  retryOf?: string;
  error?: { message: string; stack?: string } | null;
  data?: { sections: TraceDataSection[] };
  debug?: Record<string, any>;
};

export type TraceErrorRecord = {
  eventId: string;
  message: string;
  stack?: string;
  type?: string;
  timestamp?: string;
};

export type TraceSessionSummary = {
  totalDurationMs: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedInputTokens: number;
  totalBytesIn: number;
  totalBytesOut: number;
  eventCounts: Record<string, number>;
};

export type TraceSessionStatus = "in_progress" | "success" | "error" | "partial";

export type TraceSinkSnapshot =
  | { type: "file"; path: string }
  | { type: "custom" }
  | { type: "cognipeer"; url: string }
  | { type: "http"; url: string };

export type TraceSessionConfigSnapshot = {
  enabled: boolean;
  logData: boolean;
  sink: TraceSinkSnapshot;
};

export type TraceSessionFile = {
  sessionId: string;
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  agent?: { name?: string; version?: string; model?: string; provider?: string };
  config: TraceSessionConfigSnapshot;
  summary: TraceSessionSummary;
  events: TraceEventRecord[];
  status: TraceSessionStatus;
  errors: TraceErrorRecord[];
};

export type ResolvedTraceSink =
  | { type: "file"; baseDir: string }
  | { type: "custom"; onEvent?: (event: TraceEventRecord) => void | Promise<void>; onSession?: (session: TraceSessionFile) => void | Promise<void> }
  | { type: "cognipeer"; url: string; apiKey: string }
  | { type: "http"; url: string; headers?: Record<string, string> };

export type ResolvedTraceConfig = {
  enabled: boolean;
  mode: "batched";
  logData: boolean;
  sink: ResolvedTraceSink;
};

export type TraceSessionRuntime = {
  sessionId: string;
  startedAt: number;
  resolvedConfig: ResolvedTraceConfig;
  events: TraceEventRecord[];
  summary: TraceSessionSummary;
  status: TraceSessionStatus;
  errors: TraceErrorRecord[];
  fileBaseDir?: string;
  fileSessionDir?: string;
};

// Handoff descriptor returned from childAgent.asHandoff(...)
export type HandoffDescriptor<TIn = any, TOut = any, TParsed = any> = {
  type: "handoff";
  toolName: string;
  description: string;
  // Optional zod schema for handoff arguments; fallback is { reason: string }
  schema?: ZodSchema<any>;
  target: SmartAgentInstance<TParsed> & { __runtime: AgentRuntimeConfig };
};

export type SmartState = {
  messages: Message[];
  // Active agent runtime parameters (dynamically swapped on handoff)
  agent?: AgentRuntimeConfig;
  summaries?: string[];
  toolHistory?: Array<{
    executionId: string;
    toolName: string;
    args: any;
    output: any;
    rawOutput?: any;
    timestamp?: string;
    summarized?: boolean;
    originalTokenCount?: number | null;
    messageId?: string;
    tool_call_id?: string;
    fromCache?: boolean;
  }>;
  toolHistoryArchived?: Array<{
    executionId: string;
    toolName: string;
    args: any;
    output: any;
    rawOutput?: any;
    timestamp?: string;
    summarized?: boolean;
    originalTokenCount?: number | null;
    messageId?: string;
    tool_call_id?: string;
    fromCache?: boolean;
  }>;
  toolCache?: Record<string, any>;
  toolCallCount?: number;
  plan?: { version: number; steps: Array<{ index: number; title: string; status: string }>; lastUpdated?: string } | null;
  planVersion?: number;
  metadata?: Record<string, any>;
  ctx?: Record<string, any>;
  // Usage tracking (per agent model call). Each agent turn that produces an AI response
  // appends an entry to usage.perRequest. totals aggregates by modelName.
  usage?: {
    perRequest: Array<{
      id: string;            // unique id per request
      modelName: string;     // resolved provider/model identifier
      usage: any;            // raw provider usage object (unmodified)
      timestamp: string;     // ISO time of capture
      turn: number;          // 1-based index of agent turn producing this response
      cachedInput?: number;  // cached / reused prompt tokens (provider specific)
    }>;
    totals: Record<string, { input: number; output: number; total: number; cachedInput: number }>;
  };
  guardrailResult?: GuardrailOutcome;
};

// Event types for observability and future streaming support
export type ToolCallEvent = {
  type: "tool_call";
  phase: "start" | "success" | "error" | "skipped";
  name: string;
  id?: string;
  args?: any;
  result?: any;
  error?: { message: string } | undefined;
  durationMs?: number;
};

export type PlanEvent = {
  type: "plan";
  source: "manage_todo_list" | "system";
  operation?: "write" | "read";
  todoList?: Array<{ id: number; title: string; description: string; status: string; evidence?: string }>;
  version?: number;
};

export type SummarizationEvent = {
  type: "summarization";
  summary: string;
  archivedCount?: number;
};

export type FinalAnswerEvent = {
  type: "finalAnswer";
  content: string;
};

export type MetadataEvent = {
  type: "metadata";
  usage?: any;
  modelName?: string;
  limits?: SmartAgentLimits;
  [key: string]: any;
};

export type HandoffEvent = {
  type: "handoff";
  from?: string;
  to?: string;
  toolName: string;
};

export type GuardrailEvent = {
  type: "guardrail";
  phase: GuardrailPhase;
  guardrailId?: string;
  guardrailTitle?: string;
  ruleId?: string;
  ruleTitle?: string;
  disposition: GuardrailDisposition;
  reason?: string;
  details?: Record<string, any>;
};

export type SmartAgentEvent =
  | ToolCallEvent
  | PlanEvent
  | SummarizationEvent
  | FinalAnswerEvent
  | MetadataEvent
  | HandoffEvent
  | GuardrailEvent;

export type InvokeConfig = RunnableConfig & {
  // Optional per-call event hook (overrides SmartAgentOptions.onEvent if provided)
  onEvent?: (event: SmartAgentEvent) => void;
};

// Structured agent result returned by invoke
export type AgentInvokeResult<TOutput = unknown> = {
  content: string;
  // If SmartAgentOptions.outputSchema is set, this will contain the parsed and validated output.
  // TOutput will be inferred from the provided Zod schema.
  output?: TOutput;
  metadata: { usage?: any };
  messages: Message[];
  state?: SmartState;
};

// Public shape returned by the agent factory
export type SmartAgentInstance<TOutput = unknown> = {
  invoke: (input: SmartState, config?: InvokeConfig) => Promise<AgentInvokeResult<TOutput>>;
  // Convert this agent into a tool usable by another agent. Accepts optional overrides.
  asTool: (opts: { toolName: string; description?: string; inputDescription?: string } ) => ToolInterface<any, any, any>;
  // Create a handoff descriptor so another agent can switch control to this one mid-conversation
  asHandoff: (opts: { toolName?: string; description?: string; schema?: ZodSchema<any>; }) => HandoffDescriptor<any, any, TOutput>;
  __runtime: AgentRuntimeConfig;
};

// --- Generic aliases for migration to agent-sdk naming ---
export type AgentLimits = SmartAgentLimits;
export type AgentOptions = SmartAgentOptions;
export type AgentState = SmartState;
export type AgentEvent = SmartAgentEvent;
export type AgentResult<T = unknown> = AgentInvokeResult<T>;
export type AgentInstance<T = unknown> = SmartAgentInstance<T>;
