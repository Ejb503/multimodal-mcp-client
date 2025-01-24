import React, { ReactNode } from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useSidebarItems } from "../SidebarItems";
import { McpContext } from "../../../contexts/McpContext";
import type {
  McpClientState,
  McpContextType,
} from "../../../types/McpContext.types";
import { McpDataProvider } from "../../../contexts/McpDataContext";
import { GlobalLlmProvider } from "../../../contexts/LlmProviderContext";
import { LlmRegistryProvider } from "../../../features/llm-registry/contexts/LlmRegistryContext";
import type { ServerConfig } from "../../../types/server.types";

// Mock modules
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../../contexts/McpContext", async () => {
  const actual = await vi.importActual<
    typeof import("../../../contexts/McpContext")
  >("../../../contexts/McpContext");
  return {
    ...actual,
    McpContext: React.createContext<McpContextType | null>(null),
  };
});

// Mock the config module
const mockConfig = {
  defaults: {
    serverTypes: {
      stdio: {
        icon: "solar:server-minimalistic-line-duotone",
        color: "primary" as const,
        description: "Local stdio-based MCP server",
      },
      remote: {
        icon: "solar:server-square-line-duotone",
        color: "secondary" as const,
        description: "Remote MCP server",
      },
    },
    unconnected: {
      icon: "solar:server-square-line-duotone",
      color: "secondary" as const,
      description: "Remote MCP server (not connected)",
    },
  },
  mcpServers: {
    "systemprompt-dev": {
      command: "npx",
      args: [],
      env: {},
      metadata: {
        icon: "solar:programming-line-duotone",
        color: "success" as const,
        description: "Systemprompt Agent MCP server",
      },
      type: "stdio",
    },
    "systemprompt-agent-server": {
      command: "npx",
      args: [],
      env: {},
      metadata: {
        icon: "solar:programming-line-duotone",
        color: "success" as const,
        description: "Systemprompt Agent MCP server",
      },
      type: "stdio",
    },
  },
};

vi.mock("../../../config/mcp.config.json", () => ({
  default: mockConfig,
}));

vi.mock("../../../contexts/McpDataContext", () => ({
  McpDataProvider: ({ children }: { children: React.ReactNode }) => children,
  useMcpServerData: () => ({
    mcpServers: mockConfig.mcpServers as Record<string, ServerConfig>,
    defaults: mockConfig.defaults,
  }),
}));

const wrapper = ({ children }: { children: ReactNode }) => {
  const mockClients: Record<string, McpClientState> = {
    "systemprompt-dev": {
      connectionStatus: "connected",
      client: null,
      serverType: "stdio",
      serverUrl: "",
      apiKey: "",
      resources: [],
      prompts: [],
      tools: [],
      loadedResources: [],
      serverInfo: {
        name: "systemprompt-dev",
        version: "1.0.0",
        protocolVersion: "1.0.0",
        capabilities: {},
        metadata: mockConfig.mcpServers["systemprompt-dev"].metadata,
      },
      serverConfig: {
        key: "systemprompt-dev",
        label: "Systemprompt Dev",
        icon: mockConfig.mcpServers["systemprompt-dev"].metadata.icon,
        color: mockConfig.mcpServers["systemprompt-dev"].metadata.color,
        description:
          mockConfig.mcpServers["systemprompt-dev"].metadata.description,
        serverId: "systemprompt-dev",
      },
    },
    "systemprompt-agent-server": {
      connectionStatus: "disconnected",
      client: null,
      serverType: "stdio",
      serverUrl: "",
      apiKey: "",
      resources: [],
      prompts: [],
      tools: [],
      loadedResources: [],
      serverInfo: undefined,
      serverConfig: {
        key: "systemprompt-agent-server",
        label: "Systemprompt Agent Server",
        icon: mockConfig.defaults.unconnected.icon,
        color: mockConfig.defaults.unconnected.color,
        description: mockConfig.defaults.unconnected.description,
        serverId: "systemprompt-agent-server",
      },
    },
  };

  const mockContext: McpContextType = {
    clients: mockClients,
    activeClients: ["systemprompt-dev"],
    connectServer: vi.fn(),
    disconnectServer: vi.fn(),
    selectPrompt: vi.fn(),
    executePrompt: vi.fn(),
    listResources: vi.fn(),
    listPrompts: vi.fn(),
    listTools: vi.fn(),
    executeTool: vi.fn(),
    readResource: vi.fn(),
    requestSampling: vi.fn(),
    pendingSampleRequests: [],
    handleApproveSampling: vi.fn(),
    handleRejectSampling: vi.fn(),
  };

  return (
    <LlmRegistryProvider>
      <GlobalLlmProvider>
        <McpDataProvider>
          <McpContext.Provider value={mockContext}>
            {children}
          </McpContext.Provider>
        </McpDataProvider>
      </GlobalLlmProvider>
    </LlmRegistryProvider>
  );
};

describe("useSidebarItems", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render all sidebar sections", () => {
    const { result } = renderHook(() => useSidebarItems(), { wrapper });

    expect(result.current.sections).toHaveLength(5);
    expect(result.current.sections.map((s) => s.title)).toEqual([
      "Main",
      "Core Servers",
      "Logs",
      "Settings",
      "Help",
    ]);
  });

  it("should render main section items correctly", () => {
    const { result } = renderHook(() => useSidebarItems(), { wrapper });

    const mainSection = result.current.sections.find((s) => s.title === "Main");
    expect(mainSection?.items).toHaveLength(3);
    expect(mainSection?.items.map((i) => i.label)).toEqual([
      "Control Center",
      "Agents",
      "Create Agent",
    ]);
  });

  it("should render server items with correct connection states", () => {
    const { result } = renderHook(() => useSidebarItems(), { wrapper });

    const serverSection = result.current.sections.find(
      (s) => s.title === "Core Servers"
    );
    expect(serverSection).toBeDefined();
    expect(serverSection?.items).toHaveLength(2);

    // Test connected server - should use server's metadata since it's connected
    const connectedServer = serverSection?.items.find(
      (item) => item.key === "systemprompt-dev"
    );
    expect(connectedServer).toBeDefined();
    expect(connectedServer?.icon).toBe(
      mockConfig.mcpServers["systemprompt-dev"].metadata.icon
    );
    expect(connectedServer?.color).toBe("success"); // Connected servers should use success color
    expect(connectedServer?.description).toBe(
      mockConfig.mcpServers["systemprompt-dev"].metadata.description
    );

    // Test disconnected server - should use default unconnected metadata
    const disconnectedServer = serverSection?.items.find(
      (item) => item.key === "systemprompt-agent-server"
    );
    expect(disconnectedServer).toBeDefined();
    expect(disconnectedServer?.icon).toBe(mockConfig.defaults.unconnected.icon);
    expect(disconnectedServer?.color).toBe(
      mockConfig.defaults.unconnected.color
    );
    expect(disconnectedServer?.description).toBe(
      mockConfig.defaults.unconnected.description
    );

    // Verify server IDs are set correctly
    expect(connectedServer?.serverId).toBe("systemprompt-dev");
    expect(disconnectedServer?.serverId).toBe("systemprompt-agent-server");
  });

  it("should handle navigation when clicking items", () => {
    const { result } = renderHook(() => useSidebarItems(), { wrapper });

    result.current.handleItemClick("/test");
    expect(mockNavigate).toHaveBeenCalledWith("/test");
  });

  it("should handle missing server configuration gracefully", () => {
    const { result } = renderHook(() => useSidebarItems(), { wrapper });

    const serverSection = result.current.sections.find(
      (s) => s.title === "Core Servers"
    );
    const items = serverSection?.items || [];

    // Verify all items have required properties
    items.forEach((item) => {
      expect(item.key).toBeDefined();
      expect(item.label).toBeDefined();
      expect(item.icon).toBeDefined();
      expect(item.description).toBeDefined();
      expect(item.href).toBeDefined();
      expect(item.color).toBeDefined();
      expect(item.serverId).toBeDefined();
    });
  });
});
