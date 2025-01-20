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
  customServers?: Record<string, StdioServerConfig>;
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

const fetchUserData = async () => {
  const response = await fetch("/v1/user/mcp", {
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
};

const fetchMcpData = async () => {
  const response = await fetch("/v1/mcp", {
    headers: {
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  return data;
};

export function McpDataProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<McpUser | null>(null);
  const [mcpData, setMcpData] = useState<McpData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch user data first
      const userData = await fetchUserData();
      console.log("User data received:", userData);
      setUser(userData);

      // Only fetch MCP data if we have valid user data
      if (userData) {
        const mcpData = await fetchMcpData();
        console.log("MCP data received:", mcpData);

        // Update mcp.config.json with the server configuration
        try {
          await fetch("/v1/config/mcp", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              mcpServers: mcpData.mcpServers,
              customServers: mcpData.customServers || {},
            }),
          });
          console.log("Successfully updated mcp.config.json");
        } catch (configError) {
          console.error("Failed to update mcp.config.json:", configError);
        }

        setMcpData(mcpData);
      }
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
