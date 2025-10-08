import { createAgent, createTool } from "@cognipeer/agent-sdk";
import { z } from "zod";

type Message = { role: string; content: any; tool_calls?: any[] };

const lookupWeather = createTool({
  name: "lookup_weather",
  description: "Fake weather lookup that echoes a canned forecast",
  schema: z.object({ city: z.string().min(1) }),
  func: async ({ city }) => ({ city, forecast: "Sunny and 25°C" }),
});

let turn = 0;
let lastCity: string | null = null;
const fakeModel = {
  bindTools() {
    return this;
  },
  async invoke(messages: Message[]) {
    turn += 1;
    if (turn === 1) {
      const latestUser = messages[messages.length - 1];
      const requestedCity = /weather\s+in\s+(?<city>[a-zA-Z\s]+)/i.exec(String(latestUser?.content || ""))?.groups?.city?.trim() ?? "unknown";
      lastCity = requestedCity;
      return {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_weather_1",
            type: "function",
            function: {
              name: "lookup_weather",
              arguments: JSON.stringify({ city: requestedCity }),
            },
          },
        ],
      };
    }
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "tool") {
      try {
        const payload = typeof lastMessage.content === "string" ? JSON.parse(lastMessage.content) : lastMessage.content;
        return {
          role: "assistant",
          content: `Forecast for ${payload.city}: ${payload.forecast}`,
        };
      } catch {
        return { role: "assistant", content: `Forecast for ${lastCity ?? "your city"}` };
      }
    }
    return { role: "assistant", content: "I am unsure." };
  },
};

const agent = createAgent({
  model: fakeModel as any,
  tools: [lookupWeather],
  limits: { maxToolCalls: 3 },
});

let checkpointed = false;
const checkpointOnFirstToolRequest = (state: any) => {
  if (checkpointed) return false;
  const last = state.messages[state.messages.length - 1];
  if (Array.isArray(last?.tool_calls) && last.tool_calls.length > 0 && !state.ctx?.__resumeStage) {
    checkpointed = true;
    return true;
  }
  return false;
};

const initialState = { messages: [{ role: "user", content: "What's the weather in Istanbul?" }] };
const invokeOptions = {
  onStateChange: checkpointOnFirstToolRequest,
  checkpointReason: "snapshot-after-first-turn",
};

const firstRun = await agent.invoke(initialState, invokeOptions);

if (firstRun.state?.ctx?.__paused) {
  console.log("Paused before running tools. Capturing snapshot...");
}

const pausedState = firstRun.state;
if (!pausedState) {
  console.log("Run completed without pause. Final answer:", firstRun.content);
  process.exit(0);
}

const snapshot = agent.snapshot(pausedState, { tag: "paused-after-first-turn" });
const serialized = JSON.stringify(snapshot, null, 2);

// Pretend we persisted to disk and loaded later
const restoredSnapshot = JSON.parse(serialized);
const resumed = await agent.resume(restoredSnapshot);

console.log("Final answer:", resumed.content);