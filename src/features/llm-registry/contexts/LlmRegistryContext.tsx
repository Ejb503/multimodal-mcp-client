import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  LlmProviderConfig,
  LlmProviderInstance,
  LlmRegistryContextType,
} from "../lib/types";
import { readLlmConfig } from "@/utils/config";

const LlmRegistryContext = createContext<LlmRegistryContextType | null>(null);

interface Props {
  children: ReactNode;
}

export function LlmRegistryProvider({ children }: Props) {
  const [providers, setProviders] = useState<LlmProviderConfig[]>([]);
  const [instances, setInstances] = useState<Map<string, LlmProviderInstance>>(
    new Map()
  );
  const [activeProvider, setActiveProvider] = useState<string | null>("gemini");
  const [providerConfig, setProviderConfig] = useState<Record<string, unknown>>(
    {
      apiKey: "",
      model: "gemini-2.0-flash-exp",
      temperature: 0.7,
      maxTokens: 1000,
    }
  );

  // Load configuration from llm.json on startup
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await readLlmConfig();
        if (config.provider) {
          setActiveProvider(config.provider);
          setProviderConfig(config.config || {});
        }
      } catch (error) {
        console.error("Failed to load LLM configuration:", error);
      }
    };

    loadConfig();
  }, []);

  const registerProvider = useCallback(
    (config: LlmProviderConfig, instance: LlmProviderInstance) => {
      console.log("Registering provider:", config.id);
      setProviders((prev) => {
        if (prev.some((p) => p.id === config.id)) {
          return prev;
        }
        return [...prev, config];
      });

      setInstances((prev) => {
        const next = new Map(prev);
        next.set(config.id, instance);
        return next;
      });
    },
    []
  );

  const unregisterProvider = useCallback((providerId: string) => {
    setProviders((prev) => prev.filter((p) => p.id !== providerId));
    setInstances((prev) => {
      const next = new Map(prev);
      next.delete(providerId);
      return next;
    });
  }, []);

  const getProviderConfig = useCallback(
    (providerId: string): LlmProviderConfig | null => {
      const config = providers.find((p) => p.id === providerId);
      return config || null;
    },
    [providers]
  );

  const getProviderInstance = useCallback(
    (providerId: string): LlmProviderInstance | null => {
      const instance = instances.get(providerId);
      return instance || null;
    },
    [instances]
  );

  return (
    <LlmRegistryContext.Provider
      value={{
        providers,
        activeProvider,
        providerConfig,
        getProviderConfig,
        getProviderInstance,
        registerProvider,
        unregisterProvider,
      }}
    >
      {children}
    </LlmRegistryContext.Provider>
  );
}

export function useLlmRegistry() {
  const context = useContext(LlmRegistryContext);
  if (!context) {
    throw new Error("useLlmRegistry must be used within a LlmRegistryProvider");
  }
  return context;
}
