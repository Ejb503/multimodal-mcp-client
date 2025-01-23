import { LlmProviderConfig } from "@/features/llm-registry/lib/types";

export const geminiProvider: LlmProviderConfig = {
  id: "gemini",
  name: "Google Gemini Flash",
  description: "Google's Gemini Flash language model",
  configSchema: {
    apiKey: {
      type: "string",
      label: "API Key",
      description:
        "Your Google Gemini API key (optional if set in VITE_GEMINI_API_KEY environment variable)",
      isSecret: true,
    },
    model: {
      type: "select",
      label: "Model",
      description: "The Gemini model to use",
      default: "gemini-2.0-flash-exp",
      options: [{ label: "Gemini Flash", value: "gemini-2.0-flash-exp" }],
    },
    temperature: {
      type: "number",
      label: "Temperature",
      description: "Controls randomness in the model's output",
      default: 0.7,
    },
    maxTokens: {
      type: "number",
      label: "Max Tokens",
      description: "Maximum number of tokens to generate",
      default: 1000,
    },
  },
};
