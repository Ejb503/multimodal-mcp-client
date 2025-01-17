import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServerPageContent } from "../components/ServerPageContent";
import { McpContext } from "../../../contexts/McpContext";
import type { McpContextType } from "../../../contexts/McpContext.types";
import React from "react";

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
      <McpContext.Provider value={mockContext}>
        <ServerPageContent serverId="test-server" serverName="Test Server" />
      </McpContext.Provider>
    );

    expect(screen.getByText("Test Server")).toBeInTheDocument();
  });
});
