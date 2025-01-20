import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServerPageContent } from "../components/ServerPageContent";
import { McpContext } from "../../../contexts/McpContext";
import type { McpContextType } from "../../../contexts/McpContext.types";
import React from "react";
import { GlobalLlmProvider } from "../../../contexts/LlmProviderContext";
import { LlmRegistryProvider } from "../../../features/llm-registry/contexts/LlmRegistryContext";
import { McpDataProvider } from "../../../contexts/McpDataContext";

vi.mock("../../../contexts/LlmProviderContext", () => ({
  GlobalLlmProvider: ({ children }: { children: React.ReactNode }) => children,
  useGlobalLlm: () => ({
    executePrompt: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

vi.mock("../../../features/llm-registry/contexts/LlmRegistryContext", () => ({
  LlmRegistryProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

vi.mock("../../../contexts/McpDataContext", () => ({
  McpDataProvider: ({ children }: { children: React.ReactNode }) => children,
  useMcpData: () => ({
    mcpData: {
      mcpServers: {},
      available: {},
      defaults: {
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
      },
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe("ServerPageContent", () => {
  it("renders server content when server is found", () => {
    const mockContext: McpContextType = {
      clients: {
        "test-server": {
          connectionStatus: "connected",
          client: null,
          serverType: "stdio",
          serverUrl: "http://test",
          apiKey: "test",
          resources: [],
          prompts: [],
          tools: [],
          loadedResources: [],
        },
      },
      activeClients: ["test-server"],
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

    render(
      <LlmRegistryProvider>
        <GlobalLlmProvider>
          <McpDataProvider>
            <McpContext.Provider value={mockContext}>
              <ServerPageContent
                serverId="test-server"
                serverName="Test Server"
              />
            </McpContext.Provider>
          </McpDataProvider>
        </GlobalLlmProvider>
      </LlmRegistryProvider>
    );

    expect(screen.getByText("Test Server")).toBeInTheDocument();
  });
});
