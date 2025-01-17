import { useGlobalLlm } from "@/contexts/LlmProviderContext";
import { PromptMessage } from "@modelcontextprotocol/sdk/types.js";

interface Prompt {
  name: string;
  messages?: PromptMessage[];
  _meta?: {
    responseSchema?: Record<string, unknown>;
    complexResponseSchema?: Record<string, unknown>;
    callback?: string;
    [key: string]: unknown;
  };
}

interface UseLlmPromptReturn {
  isLoading: boolean;
  execute: (prompt: Prompt, params: Record<string, string>) => Promise<unknown>;
}

export function useLlmPrompt(): UseLlmPromptReturn {
  const { executePrompt, isLoading } = useGlobalLlm();

  const execute = async (prompt: Prompt, params: Record<string, string>) => {
    if (!prompt.messages?.length) {
      throw new Error("No messages available in prompt");
    }

    return executePrompt({
      name: prompt.name,
      messages: prompt.messages,
      params,
      _meta: prompt._meta,
    });
  };

  return {
    isLoading,
    execute,
  };
}
