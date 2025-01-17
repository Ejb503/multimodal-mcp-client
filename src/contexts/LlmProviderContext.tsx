import { createContext, useContext, ReactNode } from "react";
import { PromptMessage } from "@modelcontextprotocol/sdk/types.js";
import { useLlmRegistry } from "@/features/llm-registry";

interface LlmProviderContextType {
  executePrompt: (prompt: {
    name: string;
    messages: PromptMessage[];
    params?: Record<string, unknown>;
    _meta?: {
      responseSchema?: Record<string, unknown>;
    };
  }) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

const LlmProviderContext = createContext<LlmProviderContextType | null>(null);

interface Props {
  children: ReactNode;
}

export function GlobalLlmProvider({ children }: Props) {
  const { activeProvider, getProviderInstance } = useLlmRegistry();

  const instance = activeProvider ? getProviderInstance(activeProvider) : null;

  if (!instance) {
    return <>{children}</>;
  }

  return (
    <LlmProviderContext.Provider
      value={{
        executePrompt: instance.executePrompt,
        isLoading: instance.isLoading,
        error: instance.error,
      }}
    >
      {children}
    </LlmProviderContext.Provider>
  );
}

export function useGlobalLlm() {
  const context = useContext(LlmProviderContext);
  if (!context) {
    throw new Error("useGlobalLlm must be used within a GlobalLlmProvider");
  }
  return context;
}
