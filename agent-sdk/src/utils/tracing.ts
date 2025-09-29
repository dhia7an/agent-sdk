import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
import { nanoid } from "nanoid";
import type {
  AgentRuntimeConfig,
  ResolvedTraceConfig,
  SmartAgentOptions,
  SmartAgentTraceUploadConfig,
  SmartAgentTracingConfig,
  TraceDataSection,
  TraceToolCallSection,
  TraceErrorRecord,
  TraceEventRecord,
  TraceSessionFile,
  TraceSessionRuntime,
  TraceSessionStatus,
  TraceSessionSummary,
} from "../types.js";
function resolveLogsBaseDir(customPath?: string, ensureDirectory = true) {
  const root = process.cwd();
  const base = customPath && customPath.trim().length > 0 ? customPath : path.join(root, "logs");
  if (ensureDirectory) {
    ensureDir(base);
  }
  return base;
}

export function getModelName(model: any): string | undefined {
  return (
    model?.model ??
    model?.modelName ??
    model?.options?.model ??
    model?.lc_alias ??
    model?.constructor?.name ??
    undefined
  );
}

export function getProviderName(model: any): string | undefined {
  return (
    model?.provider ??
    model?.options?.provider ??
    model?.client?.provider ??
    model?.client?.config?.provider ??
    model?.configuration?.provider ??
    model?.lc_kwargs?.provider ??
    undefined
  );
}

const DEFAULT_TRACE_CONFIG: Omit<ResolvedTraceConfig, "path"> & { path?: string } = {
  enabled: false,
  mode: "batched",
  path: undefined,
  logData: true,
  upload: undefined,
  writeToFile: true,
  onLog: undefined,
};

function ensureDir(p: string) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

function withDefaults(config?: SmartAgentTracingConfig): ResolvedTraceConfig {
  const merged = {
    ...DEFAULT_TRACE_CONFIG,
    ...(config || {}),
  } as SmartAgentTracingConfig & typeof DEFAULT_TRACE_CONFIG;
  const { enabled, path: customPath } = merged;
  const writeToFile = merged.writeToFile ?? true;
  const resolvedPath = resolveLogsBaseDir(customPath, writeToFile !== false);
  return {
    enabled: !!enabled,
    path: resolvedPath,
    mode: merged.mode ?? "batched",
    logData: merged.logData ?? true,
    upload: sanitizeUploadConfig(merged.upload),
    writeToFile,
    onLog: typeof merged.onLog === "function" ? merged.onLog : undefined,
  };
}

function sanitizeUploadConfig(upload: SmartAgentTracingConfig["upload"]): SmartAgentTraceUploadConfig | undefined {
  if (!upload || typeof upload !== "object") return undefined;
  const trimmedUrl = typeof upload.url === "string" ? upload.url.trim() : "";
  if (!trimmedUrl) return undefined;
  const headers = upload.headers ? { ...upload.headers } : undefined;
  return headers ? { url: trimmedUrl, headers } : { url: trimmedUrl };
}

function sanitizeConfigForFile(config: ResolvedTraceConfig, baseDir: string): SmartAgentTracingConfig & { baseDir: string } {
  const upload = config.upload?.url ? { url: config.upload.url } : undefined;
  const { path, mode, logData, enabled, writeToFile } = config;
  return {
    enabled,
    path,
    mode,
    logData,
    writeToFile,
    ...(upload ? { upload } : {}),
    baseDir,
  };
}

async function uploadTraceSession(
  upload: SmartAgentTraceUploadConfig | undefined,
  payload: TraceSessionFile
): Promise<void> {
  if (!upload?.url) return;
  const fetchFn = typeof globalThis.fetch === "function" ? globalThis.fetch.bind(globalThis) : undefined;
  if (!fetchFn) {
    throw new Error("HTTP upload requested but fetch is not available in this runtime.");
  }

  const headers = { ...(upload.headers || {}) } as Record<string, string>;
  const hasContentType = Object.keys(headers).some((key) => key.toLowerCase() === "content-type");
  if (!hasContentType) {
    headers["content-type"] = "application/json";
  }

  const response = await fetchFn(upload.url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  console.log("Trace upload response", response.status, response.statusText);

  if (!response.ok) {
    let responseText = "";
    try {
      responseText = await response.text();
    } catch {
      // ignore
    }
    const statusLine = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
    const bodyPreview = responseText ? ` - ${responseText.slice(0, 200)}` : "";
    throw new Error(`${statusLine}${bodyPreview}`);
  }
}

function createEmptySummary(): TraceSessionSummary {
  return {
    totalDurationMs: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCachedInputTokens: 0,
    totalBytesIn: 0,
    totalBytesOut: 0,
    eventCounts: {},
  };
}

function generateSessionId(): string {
  return `sess_${nanoid(18)}`;
}

function generateEventId(sequence: number): string {
  return `evt_${String(sequence).padStart(4, "0")}_${nanoid(4)}`;
}

function defaultEventLabel(type: string): string {
  switch (type) {
    case "ai_call":
      return "Assistant Response";
    case "tool_call":
      return "Tool Execution";
    case "session":
      return "Session Event";
    default:
      return type.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

function ensureUniqueSections(eventId: string, sections?: TraceDataSection[]): TraceDataSection[] | undefined {
  if (!sections || sections.length === 0) return undefined;
  const labelCounts = new Map<string, number>();
  const normalized: TraceDataSection[] = [];
  let counter = 1;

  for (const section of sections) {
    const baseLabel = section.label?.trim().length ? section.label.trim() : defaultSectionLabel(section.kind);
    const nextCount = (labelCounts.get(baseLabel) || 0) + 1;
    labelCounts.set(baseLabel, nextCount);
    const finalLabel = nextCount > 1 ? `${baseLabel} (${nextCount})` : baseLabel;

    let id = section.id?.trim();
    if (!id) {
      id = `${section.kind}-${eventId}-${String(counter).padStart(2, "0")}`;
    }
    counter += 1;

    normalized.push({
      ...section,
      id,
      label: finalLabel,
    } as TraceDataSection);
  }

  return normalized;
}

function defaultSectionLabel(kind: TraceDataSection["kind"]): string {
  switch (kind) {
    case "message":
      return "Message";
    case "tool_call":
      return "Tool Call";
    case "tool_result":
      return "Tool Result";
    case "tool_response":
      return "Tool Response";
    case "summary":
      return "Summary";
    case "metadata":
      return "Details";
    default:
      return "Section";
  }
}

function buildMessageLabel(role: string, index: number): string {
  const normalized = role?.trim().length ? role.trim() : "message";
  const base = `${normalized.charAt(0).toUpperCase()}${normalized.slice(1)} Message`;
  return index > 1 ? `${base} #${index}` : base;
}

function toDisplayString(value: any): string {
  const sanitized = sanitizeTracePayload(value);
  if (sanitized == null) return "";
  if (typeof sanitized === "string") return sanitized;
  if (Array.isArray(sanitized)) {
    return sanitized
      .map((item) => toDisplayString(item))
      .filter((part) => part && part.trim().length > 0)
      .join("\n");
  }
  if (typeof sanitized === "object") {
    if (typeof (sanitized as any).text === "string" && Object.keys(sanitized).length === 1) {
      return (sanitized as any).text;
    }
    if (typeof (sanitized as any).content === "string") {
      return (sanitized as any).content;
    }
    try {
      return JSON.stringify(sanitized, null, 2);
    } catch {
      return String(sanitized);
    }
  }
  return String(sanitized);
}

function parseToolArguments(args: any): any {
  if (args == null) return undefined;
  if (typeof args === "string") {
    try {
      return JSON.parse(args);
    } catch {
      return args;
    }
  }
  return args;
}

function collectToolCallSectionsFromMessage(message: any): TraceToolCallSection[] {
  const sections: TraceToolCallSection[] = [];
  if (!message) return sections;

  const addCall = (call: any) => {
    if (!call) return;
    const toolName = call?.name || call?.tool || call?.function?.name || call?.function_call?.name || "tool";
    const rawArgs = call?.arguments ?? call?.args ?? call?.input ?? call?.function?.arguments ?? call?.function_call?.arguments;
    const parsedArgs = parseToolArguments(rawArgs);
    const argumentsPayload = sanitizeTracePayload(parsedArgs ?? rawArgs ?? {});
    sections.push({
      kind: "tool_call",
      label: `Tool Call: ${toolName}`,
      tool: toolName,
      arguments: argumentsPayload,
    });
  };

  const directCalls = Array.isArray(message?.tool_calls) ? message.tool_calls : undefined;
  if (directCalls) {
    directCalls.forEach((call: any) => addCall(call));
  }

  return sections;
}

function convertMessageListToSections(messageList?: any[]): TraceDataSection[] | undefined {
  if (!Array.isArray(messageList) || messageList.length === 0) return undefined;
  const sections: TraceDataSection[] = [];
  const roleCounts = new Map<string, number>();

  for (const message of messageList) {
    if (!message) continue;

    const toolSections = collectToolCallSectionsFromMessage(message);
    if (toolSections.length > 0) {
      sections.push(...toolSections);
      continue;
    }

    const role = typeof message?.role === "string" ? message.role : "assistant";
    const next = (roleCounts.get(role) || 0) + 1;
    roleCounts.set(role, next);

    let content = toDisplayString(message?.content ?? "");
    if (!content || !content.trim().length) {
      if (toolSections.length > 0) {
        content = "[tool call]";
      } else if (typeof message?.content === "undefined" || message?.content === null) {
        continue;
      } else {
        content = toDisplayString(sanitizeTracePayload(message?.content));
        if (!content || !content.trim().length) continue;
      }
    }

    sections.push({
      kind: "message",
      label: buildMessageLabel(role, next),
      role,
      content,
      metadata: typeof message?.name === "string" ? { name: message.name } : undefined,
    });
  }

  return sections.length > 0 ? sections : undefined;
}

export function createTraceSession(opts: SmartAgentOptions): TraceSessionRuntime | undefined {
  const cfg = withDefaults(opts.tracing);
  if (!cfg.enabled) return undefined;

  const sessionId = generateSessionId();
  const sessionDir = path.join(cfg.path, sessionId);
  if (cfg.writeToFile) {
    ensureDir(sessionDir);
  }

  return {
    sessionId,
    baseDir: cfg.path,
    sessionDir,
    startedAt: Date.now(),
    resolvedConfig: cfg,
    events: [],
    summary: createEmptySummary(),
    status: "in_progress",
    errors: [],
  };
}

export function recordTraceEvent(
  session: TraceSessionRuntime | undefined,
  event: {
    type: string;
    label?: string;
    timestamp?: string;
    actor?: TraceEventRecord["actor"];
    status?: TraceEventRecord["status"];
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
    messageList?: any[];
    debug?: Record<string, any>;
  }
): TraceEventRecord | undefined {
  if (!session) return undefined;


  const sequence = session.events.length + 1;
  const id = generateEventId(sequence);
  const timestampIso = event.timestamp || new Date().toISOString();
  const status = event.status ?? "success";
  const baseLabel = event.label?.trim().length ? event.label.trim() : defaultEventLabel(event.type);
  const eventLabel = `${baseLabel} #${sequence}`;

  const durationMs = event.durationMs !== undefined ? Number(event.durationMs) : undefined;
  if (!Number.isNaN(durationMs ?? NaN) && durationMs !== undefined) {
    session.summary.totalDurationMs += durationMs;
  }

  const inputTokens = event.inputTokens !== undefined ? Number(event.inputTokens) : undefined;
  if (!Number.isNaN(inputTokens ?? NaN) && inputTokens !== undefined) {
    session.summary.totalInputTokens += inputTokens;
  }

  const outputTokens = event.outputTokens !== undefined ? Number(event.outputTokens) : undefined;
  if (!Number.isNaN(outputTokens ?? NaN) && outputTokens !== undefined) {
    session.summary.totalOutputTokens += outputTokens;
  }

  const cachedInputTokens = event.cachedInputTokens !== undefined ? Number(event.cachedInputTokens) : undefined;
  if (!Number.isNaN(cachedInputTokens ?? NaN) && cachedInputTokens !== undefined) {
    session.summary.totalCachedInputTokens += cachedInputTokens;
  }

  const totalTokens = event.totalTokens !== undefined ? Number(event.totalTokens) : undefined;
  const requestBytes = event.requestBytes !== undefined ? Number(event.requestBytes) : undefined;
  if (!Number.isNaN(requestBytes ?? NaN) && requestBytes !== undefined) {
    session.summary.totalBytesIn += requestBytes;
  }

  const responseBytes = event.responseBytes !== undefined ? Number(event.responseBytes) : undefined;
  if (!Number.isNaN(responseBytes ?? NaN) && responseBytes !== undefined) {
    session.summary.totalBytesOut += responseBytes;
  }

  session.summary.eventCounts[event.type] = (session.summary.eventCounts[event.type] || 0) + 1;

  let sections: TraceDataSection[] | undefined;
  if (session.resolvedConfig.logData) {
    const converted = convertMessageListToSections(event.messageList);
    sections = ensureUniqueSections(id, converted);
  }

  const record: TraceEventRecord = {
    sessionId: session.sessionId,
    id,
    type: event.type,
    label: eventLabel,
    sequence,
    timestamp: timestampIso,
    actor: event.actor,
    status,
    durationMs,
    inputTokens,
    outputTokens,
    totalTokens,
    cachedInputTokens,
    requestBytes,
    responseBytes,
    model: event.model,
    provider: event.provider,
    toolExecutionId: event.toolExecutionId,
    retryOf: event.retryOf,
    error: event.error ?? (status === "error" ? { message: "Unknown error" } : undefined) ?? undefined,
    data: sections ? { sections } : undefined,
    debug: event.debug,
  };

  if (status === "error") {
    const errorInfo = event.error ?? { message: "Unknown error" };
    session.errors.push({
      eventId: id,
      message: errorInfo.message,
      stack: errorInfo.stack,
      type: event.type,
      timestamp: timestampIso,
    });
  }

  session.events.push(record);
  if (typeof session.resolvedConfig.onLog === "function") {
    try {
      const cloned = JSON.parse(JSON.stringify(record));
      session.resolvedConfig.onLog(cloned);
    } catch (err) {
      if (typeof console !== "undefined" && typeof console.warn === "function") {
        console.warn("Trace onLog callback failed", err);
      }
    }
  }
  return record;
}

export async function finalizeTraceSession(session: TraceSessionRuntime | undefined, params: {
  agentRuntime?: AgentRuntimeConfig;
  status?: TraceSessionStatus;
  error?: { message?: string; stack?: string } | null;
} = {}): Promise<TraceSessionFile | undefined> {
  if (!session) return undefined;

  const endedAtMs = Date.now();
  const endedAtIso = new Date(endedAtMs).toISOString();
  const durationMs = endedAtMs - session.startedAt;
  const startedAtIso = new Date(session.startedAt).toISOString();

  const agentInfo = params.agentRuntime
    ? {
      name: params.agentRuntime.name,
      version: params.agentRuntime.version,
      model: getModelName(params.agentRuntime.model),
      provider: getProviderName(params.agentRuntime.model),
    }
    : undefined;

  if (params.error) {
    session.errors.push({
      eventId: "session",
      message: params.error.message || "Unknown error",
      stack: params.error.stack,
      type: "session",
      timestamp: endedAtIso,
    });
  }

  const configForFile = sanitizeConfigForFile(session.resolvedConfig, session.baseDir);
  const initialStatus: TraceSessionStatus = params.status
    ? params.status
    : session.errors.length > 0
      ? "error"
      : "success";

  const buildPayload = (status: TraceSessionStatus): TraceSessionFile => ({
    sessionId: session.sessionId,
    startedAt: startedAtIso,
    endedAt: endedAtIso,
    durationMs,
    agent: agentInfo,
    config: configForFile,
    summary: session.summary,
    events: session.events,
    status,
    errors: session.errors,
  });

  const payloadForUpload = buildPayload(initialStatus);
  let uploadFailed = false;

  if (session.resolvedConfig.upload?.url) {
    try {
      await uploadTraceSession(session.resolvedConfig.upload, payloadForUpload);
    } catch (err) {
      uploadFailed = true;
      const message = err instanceof Error ? err.message : String(err);
      session.errors.push({
        eventId: "upload",
        message,
        type: "upload",
        timestamp: endedAtIso,
      });
    }
  }

  let status: TraceSessionStatus = params.status
    ? params.status
    : session.errors.length > 0
      ? session.errors.some((error) => error.type && error.type !== "upload")
        ? "error"
        : uploadFailed
          ? "partial"
          : "success"
      : uploadFailed && initialStatus === "success"
        ? "partial"
        : initialStatus;

  const filePayload = buildPayload(status);
  if (session.resolvedConfig.writeToFile) {
    const filePath = path.join(session.sessionDir, "trace.session.json");
    await fs.promises.writeFile(filePath, JSON.stringify(filePayload, null, 2), "utf8");
  }
  return filePayload;
}

export type { ResolvedTraceConfig };

export function sanitizeTracePayload(value: any): any {
  try {
    const cache = new WeakSet();
    const json = JSON.stringify(
      value,
      (_key, val) => {
        if (typeof val === "function") return `[Function ${val.name || "anonymous"}]`;
        if (typeof val === "bigint") return val.toString();
        if (val instanceof Error) return { message: val.message, stack: val.stack };
        if (val && typeof val === "object") {
          if (cache.has(val)) return "[Circular]";
          cache.add(val);
        }
        return val;
      },
      2
    );
    return JSON.parse(json);
  } catch {
    try {
      return typeof value === "string" ? value : String(value);
    } catch {
      return "[Unserializable]";
    }
  }
}

export function estimatePayloadBytes(value: any): number {
  try {
    const json = JSON.stringify(value);
    return Buffer.byteLength(json ?? "", "utf8");
  } catch {
    try {
      return Buffer.byteLength(String(value ?? ""), "utf8");
    } catch {
      return 0;
    }
  }
}
