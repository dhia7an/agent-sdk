import { fromLangchainModel } from "@cognipeer/agent-sdk";
import { ChatOpenAI } from "@langchain/openai";

// Simple demo: ask model to describe an image via URL.
// Uses OpenAI-compatible multimodal model through LangChain.

const apiKey = process.env.OPENAI_API_KEY || "";
if (!apiKey) {
  console.error("Please set OPENAI_API_KEY to run this example.");
  process.exit(1);
}

const model = fromLangchainModel(new ChatOpenAI({ model: "gpt-4o-mini", apiKey }));

const message = {
  role: "user",
  content: [
    { type: "text", text: "What does this image contain?" },
    {
      type: "image_url",
      image_url: "https://fastly.picsum.photos/id/237/200/300.jpg?hmac=TmmQSbShHz9CdQm0NkEjx1Dyh_Y984R9LpNrpvH2D_U",
    },
  ],
} as const;

const response = await model.invoke([message as any]);
console.log(response.content);
