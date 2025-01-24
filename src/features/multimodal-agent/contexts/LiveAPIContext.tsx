import { createContext, FC, ReactNode, useContext, useEffect } from "react";
import { useLiveAPI, UseLiveAPIResults } from "../hooks/use-live-api";
import { useMcp } from "@/contexts/McpContext";

type LiveAPIContextType = UseLiveAPIResults;

const LiveAPIContext = createContext<LiveAPIContextType | undefined>(undefined);

export type LiveAPIProviderProps = {
  children: ReactNode;
};

export const LiveAPIProvider: FC<LiveAPIProviderProps> = ({ children }) => {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
  if (!API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY not found in environment variables");
  }

  const { clients, executeTool } = useMcp();

  useEffect(() => {
    // Check if any client is connected but has no tools
    Object.entries(clients).forEach(([serverId, client]) => {
      if (
        client.connectionStatus === "connected" &&
        (!client.tools || client.tools.length === 0)
      ) {
        if (client.client?.listTools) {
          client.client.listTools().catch((error) => {
            console.error(
              `Failed to load tools for client ${serverId}:`,
              error
            );
          });
        }
      }
    });
  }, [clients]);

  const executeToolAction = async (
    toolName: string,
    args: Record<string, unknown>
  ) => {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const availableTools = Object.entries(clients)
          .filter(([, client]) => client.connectionStatus === "connected")
          .reduce<(typeof clients)[string]["tools"]>((acc, [, client]) => {
            if (client.tools) {
              return [...acc, ...client.tools];
            }
            return acc;
          }, []);

        if (availableTools.length === 0) {
          console.warn("No tools available, waiting for tools to load...");
          await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second before retry
          continue;
        }
        const mcpTool = availableTools.find((tool) => tool.name === toolName);
        if (!mcpTool) {
          throw new Error(
            `Tool '${toolName}' not found in any connected client`
          );
        }

        // Find which client has this tool
        const clientWithTool = Object.entries(clients).find(
          ([, client]) =>
            client.connectionStatus === "connected" &&
            client.tools?.some((tool) => tool.name === toolName)
        );

        if (!clientWithTool) {
          throw new Error(`No connected client found with tool '${toolName}'`);
        }

        const result = await executeTool(clientWithTool[0], {
          name: toolName,
          args,
        });
        return result;
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error("Failed to execute tool");
        console.error(`Tool execution attempt ${attempt + 1} failed:`, error);

        if (attempt === maxRetries - 1) {
          throw lastError;
        }

        // Wait before retrying, with exponential backoff
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  };

  const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${API_KEY}`;
  const liveAPI = useLiveAPI({ url, executeToolAction });

  return (
    <LiveAPIContext.Provider
      value={{
        ...liveAPI,
        executeToolAction,
      }}
    >
      {children}
    </LiveAPIContext.Provider>
  );
};

export const useLiveAPIContext = () => {
  const context = useContext(LiveAPIContext);
  if (!context) {
    throw new Error("useLiveAPIContext must be used within a LiveAPIProvider");
  }
  return context;
};
