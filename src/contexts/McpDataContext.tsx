import { createContext, useContext, useEffect, useState } from "react";
import { ServerMetadata, StdioServerConfig } from "../../config/types";

interface McpUser {
  user: {
    name: string;
    email: string;
    roles: string[];
  };
  billing: null;
  api_key: string;
}

interface AvailableServer {
  id: string;
  title: string;
  content: string;
  description: string;
  environment_variables: string[];
  github_link: string;
  icon: string;
  npm_link: string;
  block: null;
  prompt: null;
}

interface ServerDefaults {
  serverTypes: {
    stdio: ServerMetadata;
  };
  unconnected: ServerMetadata;
}

export interface McpData {
  mcpServers: Record<string, StdioServerConfig>;
  available: Record<string, AvailableServer>;
  defaults: ServerDefaults;
}

interface McpDataContextType {
  user: McpUser | null;
  mcpData: McpData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const McpDataContext = createContext<McpDataContextType | null>(null);

const API_KEY = import.meta.env.VITE_SYSTEMPROMPT_API_KEY;

if (!API_KEY) {
  throw new Error(
    "VITE_SYSTEMPROMPT_API_KEY is not defined in environment variables"
  );
}

export function McpDataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<McpUser | null>(null);
  const [mcpData, setMcpData] = useState<McpData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log("Fetching with API key:", API_KEY);

      // Fetch user data
      const userResponse = await fetch("http://localhost/v1/user/mcp", {
        headers: {
          "Content-Type": "application/json",
          "api-key": API_KEY,
        },
      });

      if (!userResponse.ok) {
        throw new Error(
          `Failed to fetch user data: ${userResponse.statusText}`
        );
      }

      const userData = await userResponse.json();
      console.log("User data received:", userData);
      setUser(userData);

      // Fetch MCP data
      const mcpResponse = await fetch("http://localhost/v1/mcp", {
        headers: {
          "Content-Type": "application/json",
          "api-key": API_KEY,
        },
      });

      if (!mcpResponse.ok) {
        throw new Error(`Failed to fetch MCP data: ${mcpResponse.statusText}`);
      }

      const mcpData = await mcpResponse.json();
      console.log("MCP data received:", mcpData);

      // Add default server metadata
      const defaults: ServerDefaults = {
        serverTypes: {
          stdio: {
            icon: "solar:server-minimalistic-line-duotone",
            color: "primary",
            description: "Local stdio-based MCP server",
          },
        },
        unconnected: {
          icon: "solar:server-square-line-duotone",
          color: "secondary",
          description: "Remote MCP server (not connected)",
        },
      };

      setMcpData({
        ...mcpData,
        defaults,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err instanceof Error ? err : new Error("An error occurred"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refetch = async () => {
    await fetchData();
  };

  return (
    <McpDataContext.Provider
      value={{
        user,
        mcpData,
        isLoading,
        error,
        refetch,
      }}
    >
      {children}
    </McpDataContext.Provider>
  );
}

export function useMcpData() {
  const context = useContext(McpDataContext);
  if (!context) {
    throw new Error("useMcpData must be used within a McpDataProvider");
  }
  return context;
}
