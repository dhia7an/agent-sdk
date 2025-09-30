import { createAgent, createRegexGuardrail, createCodeGuardrail, GuardrailPhase } from "@cognipeer/agent-sdk";

const passwordGuardrail = createRegexGuardrail(/password|secret/i, {
  guardrailId: "password-filter",
  guardrailTitle: "Sensitive Secret Filter",
  phases: [GuardrailPhase.Request],
  rule: {
    failureMessage: "Outbound request blocked: sensitive secret detected.",
  },
});

const codeGuardrail = createCodeGuardrail({
  guardrailId: "code-ban",
  guardrailTitle: "No Code Responses",
  phases: [GuardrailPhase.Response],
  rule: {
    disposition: "block",
  },
});

const fakeModel = {
  bindTools() {
    return this;
  },
  async invoke(messages: any[]) {
    const last = messages[messages.length - 1]?.content ?? "";
    if (typeof last === "string" && last.includes("docs")) {
      return { role: "assistant", content: "Happy to help with the documentation!" };
    }
    return {
      role: "assistant",
      content: "```js\nconsole.log('Hello from the model');\n```",
    };
  },
};

const agent = createAgent({
  model: fakeModel,
  guardrails: [passwordGuardrail, codeGuardrail],
});

const blocked = await agent.invoke({
  messages: [{ role: "user", content: "My password is hunter2" }],
});

console.log("Blocked request message:", blocked.messages.at(-1));
console.log("Blocked request incidents:", blocked.state?.guardrailResult);

const filteredResponse = await agent.invoke({
  messages: [{ role: "user", content: "Can you give me a small code example?" }],
});

console.log("Filtered response message:", filteredResponse.messages.at(-1));
console.log("Filtered response incidents:", filteredResponse.state?.guardrailResult);
