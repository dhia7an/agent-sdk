import type { ZodSchema } from "zod";

import type { ToolInterface } from "./types.js";

export type SmartToolFn = (args: any) => Promise<any> | any;

export function createTool({
    name,
    description,
    schema,
    func,
    needsApproval,
    approvalPrompt,
    approvalDefaults,
}: {
    name: string;
    description?: string;
    schema: ZodSchema;
    func: SmartToolFn;
    needsApproval?: boolean;
    approvalPrompt?: string;
    approvalDefaults?: any;
}): ToolInterface {
    const execute: SmartToolFn = async (input: any) => func(input);

    const toolRecord: ToolInterface = {
        name,
        description,
        schema,
        // Our runtime prefers invoke but fallback helpers keep compatibility with LC-style tools.
        invoke: execute,
        call: execute,
        run: execute,
        func: execute,
    } as ToolInterface;

    if (typeof needsApproval === "boolean") {
        (toolRecord as any).needsApproval = needsApproval;
    }
    if (approvalPrompt !== undefined) {
        (toolRecord as any).approvalPrompt = approvalPrompt;
    }
    if (approvalDefaults !== undefined) {
        (toolRecord as any).approvalDefaults = approvalDefaults;
    }

    (toolRecord as any).__source = (toolRecord as any).__source || "smart";
    (toolRecord as any).__impl = func;

    return toolRecord;
}
