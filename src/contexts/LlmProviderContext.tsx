import { createContext, useContext, ReactNode } from "react";
import { PromptMessage } from "@modelcontextprotocol/sdk/types.js";
import { useLlmRegistry } from "@/features/llm-registry";
import { McpMeta } from "@/types/mcp";

interface LlmProviderContextType {
  executePrompt: (prompt: {
    name: string;
    messages: PromptMessage[];
    params?: Record<string, unknown>;
    _meta?: McpMeta;
  }) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

const defaultContext: LlmProviderContextType = {
  executePrompt: async () => {
    throw new Error("No LLM provider is active");
  },
  isLoading: false,
  error: null,
};

const LlmProviderContext =
  createContext<LlmProviderContextType>(defaultContext);

interface Props {
  children: ReactNode;
}

export function GlobalLlmProvider({ children }: Props) {
  const { activeProvider, getProviderInstance } = useLlmRegistry();

  const instance = activeProvider ? getProviderInstance(activeProvider) : null;

  return (
    <LlmProviderContext.Provider
      value={
        instance
          ? {
              executePrompt: instance.executePrompt,
              isLoading: instance.isLoading,
              error: instance.error,
            }
          : defaultContext
      }
    >
      {children}
    </LlmProviderContext.Provider>
  );
}

export function useGlobalLlm() {
  return useContext(LlmProviderContext);
}
