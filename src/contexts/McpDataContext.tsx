import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { SystempromptUser } from "@/types/systemprompt";
import { McpData } from "@/types/server.types";

type McpDataState =
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; user: SystempromptUser; mcpData: McpData };

interface McpDataContextType {
  state: McpDataState;
  refetch: () => Promise<void>;
  installServer: (serverId: string) => Promise<void>;
}

const McpDataContext = createContext<McpDataContextType | null>(null);

async function fetchJson<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data;
}

const api = {
  async fetchUserData(): Promise<SystempromptUser> {
    return fetchJson<SystempromptUser>("/v1/user/mcp");
  },
  async fetchMcpData(): Promise<McpData> {
    return fetchJson<McpData>("/v1/mcp");
  },
  async installServer(serverId: string): Promise<void> {
    // Simple POST to install endpoint
    await fetchJson("/v1/mcp/install", {
      method: "POST",
      body: JSON.stringify({ serverId }),
    });
  },
};

export function McpDataProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<McpDataState>({ status: "loading" });

  const fetchData = useCallback(async () => {
    setState({ status: "loading" });

    try {
      // Fetch user and MCP data in parallel
      const [userData, mcpData] = await Promise.all([
        api.fetchUserData(),
        api.fetchMcpData(),
      ]);

      // Update state with the fetched data
      setState({
        status: "success",
        user: userData,
        mcpData,
      });
      console.log(mcpData);
    } catch (error) {
      console.error("Error fetching data:", error);
      setState({
        status: "error",
        error: error instanceof Error ? error : new Error("An error occurred"),
      });
    }
  }, []);

  const installServer = useCallback(
    async (serverId: string) => {
      try {
        if (state.status !== "success") {
          throw new Error(
            "Cannot install server while loading or in error state"
          );
        }
        await api.installServer(serverId);
        // Refresh the data after installation
        await fetchData();
      } catch (error) {
        console.error("Error installing server:", error);
        throw error;
      }
    },
    [fetchData, state]
  );

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <McpDataContext.Provider
      value={{
        state,
        refetch: fetchData,
        installServer,
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

// Helper hooks for common data access patterns
export function useMcpUser() {
  const { state } = useMcpData();
  if (state.status !== "success") {
    throw new Error("Cannot access user data while loading or in error state");
  }
  return state.user;
}

export function useMcpServerData() {
  const { state } = useMcpData();
  if (state.status !== "success") {
    throw new Error("Cannot access MCP data while loading or in error state");
  }
  return state.mcpData;
}

export function useMcpAgent() {
  const { state } = useMcpData();
  if (state.status !== "success") {
    throw new Error("Cannot access MCP data while loading or in error state");
  }
  return state.mcpData.agents;
}
