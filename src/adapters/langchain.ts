import { z } from "zod";
import { createRequire } from "module";

import type { ToolInterface } from "../types.js";

type ToolExecutor = (input: any) => Promise<any> | any;

const moduleName = "@langchain/core/tools";
let cachedToolFactory: ((impl: ToolExecutor, config: Record<string, any>) => any) | null | undefined;
let cachedHasAttemptedFactory = false;

let requireFn: ((specifier: string) => any) | null = null;
try {
  requireFn = createRequire(import.meta.url);
} catch {
  requireFn = null;
}

function getExecutor(tool: ToolInterface): ToolExecutor {
  if (typeof tool.invoke === "function") return (input: any) => tool.invoke!(input);
  if (typeof tool.call === "function") return (input: any) => tool.call!(input);
  if (typeof (tool as any).func === "function") return (input: any) => (tool as any).func(input);
  if (typeof (tool as any).run === "function") return (input: any) => (tool as any).run(input);
  if (typeof (tool as unknown as ToolExecutor) === "function") {
    return tool as unknown as ToolExecutor;
  }
  throw new Error(`Tool ${tool?.name ?? "<unnamed>"} is not invokable`);
}

function loadLangchainToolFactory(): ((impl: ToolExecutor, config: Record<string, any>) => any) | null {
  if (cachedHasAttemptedFactory) return cachedToolFactory ?? null;
  cachedHasAttemptedFactory = true;
  cachedToolFactory = null;
  if (!requireFn) return null;
  try {
    const mod = requireFn(moduleName) as any;
    const factory = typeof mod?.tool === "function" ? mod.tool : undefined;
    if (typeof factory === "function") {
      cachedToolFactory = factory;
    }
  } catch {
    cachedToolFactory = null;
  }
  return cachedToolFactory ?? null;
}

function ensureSchema(candidate: any) {
  if (!candidate) return z.any();
  if (candidate instanceof z.ZodType) return candidate;
  return candidate;
}

export function toLangchainTools(tools: ToolInterface[]): any[] {
  const factory = loadLangchainToolFactory();
  if (!factory) return tools;

  return tools.map((tool) => {
    if (!tool) return tool;
    if ((tool as any).__lcTool) return (tool as any).__lcTool;

    const executor = getExecutor(tool);
    try {
      const lcTool = factory(async (input: any) => executor(input), {
        name: tool.name,
        description: tool.description,
        schema: ensureSchema((tool as any).schema),
      });
      (tool as any).__lcTool = lcTool;
      return lcTool;
    } catch {
      return tool;
    }
  });
}

export function fromLangchainTools<T extends ToolInterface = ToolInterface>(tools: any[]): T[] {
  return tools.map((tool: any) => {
    if (!tool) return tool;
    if ((tool as any).__source === "smart") return tool as T;
    if (typeof tool === "function" && !tool.name) {
      const wrapped = createSimpleTool({
        name: "anonymous_tool",
        description: undefined,
        schema: z.any(),
        executor: tool as ToolExecutor,
      });
      (wrapped as any).__source = "langchain";
      (wrapped as any).__lc = tool;
      return wrapped as T;
    }

    const name = tool.name || (tool?.lc_kwargs?.name as string) || (tool?.config?.name as string) || "tool";
    const description = tool.description || tool?.lc_kwargs?.description;
    const schema = tool.schema || tool?.lc_kwargs?.schema || z.any();
    const executor: ToolExecutor = (input: any) => {
      if (typeof tool.invoke === "function") return tool.invoke(input);
      if (typeof tool.call === "function") return tool.call(input);
      if (typeof tool._call === "function") return tool._call(input);
      if (typeof tool.run === "function") return tool.run(input);
      if (typeof tool.func === "function") return tool.func(input);
      if (typeof tool === "function") return tool(input);
      throw new Error(`LangChain tool ${name} is not invokable`);
    };

    const wrapped = createSimpleTool({
      name,
      description,
      schema,
      executor,
    });
    (wrapped as any).__source = "langchain";
    (wrapped as any).__lc = tool;
    return wrapped as T;
  });
}

function createSimpleTool({
  name,
  description,
  schema,
  executor,
}: {
  name: string;
  description?: string;
  schema: any;
  executor: ToolExecutor;
}): ToolInterface {
  const invoke = async (input: any) => executor(input);
  return {
    name,
    description,
    schema,
    invoke,
    call: invoke,
    run: invoke,
    func: invoke,
  };
}
