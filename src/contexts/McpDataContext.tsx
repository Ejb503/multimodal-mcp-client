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
    } catch (error) {
      console.error("Error fetching data:", error);
      setState({
        status: "error",
        error: error instanceof Error ? error : new Error("An error occurred"),
      });
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <McpDataContext.Provider
      value={{
        state,
        refetch: fetchData,
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
