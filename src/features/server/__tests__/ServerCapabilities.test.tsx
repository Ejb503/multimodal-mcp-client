import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ServerInfo } from "../components/ServerManagement/ServerInfo";
import type { ServerCapabilities } from "@/contexts/McpContext.types";
import { McpContext } from "../../../contexts/McpContext";
import type { McpContextType } from "../../../contexts/McpContext.types";

describe("Server Capabilities", () => {
  const mockContextValue: McpContextType = {
    clients: {
      testServer: {
        client: null,
        connectionStatus: "connected",
        serverType: "stdio",
        serverUrl: "",
        apiKey: "",
        resources: [],
        prompts: [],
        tools: [],
        loadedResources: [],
        serverInfo: {
          name: "DrupalMcpServer",
          version: "1.0.0",
          protocolVersion: "1.0",
          capabilities: {
            tools: { listChanged: true },
            prompts: { listChanged: true },
            resources: { listChanged: true },
          },
        },
      },
    },
    activeClients: ["testServer"],
    updateClientState: vi.fn(),
    setupClientNotifications: vi.fn(),
    DEFAULT_CLIENT_STATE: {
      client: null,
      connectionStatus: "disconnected",
      serverType: "stdio",
      serverUrl: "",
      apiKey: "",
      resources: [],
      prompts: [],
      tools: [],
      loadedResources: [],
    },
  };

  it("should display all enabled capabilities from server info", () => {
    const serverInfo = {
      name: "DrupalMcpServer",
      version: "1.0.0",
      protocolVersion: "1.0",
      capabilities: {
        tools: { listChanged: true },
        prompts: { listChanged: true },
        resources: {
          listChanged: true,
          subscribe: true,
        },
        logging: {},
        experimental: {
          customFeature: {},
        },
      } as ServerCapabilities,
    };

    render(<ServerInfo info={serverInfo} />);

    expect(screen.getByText("tools.listChanged")).toBeInTheDocument();
    expect(screen.getByText("prompts.listChanged")).toBeInTheDocument();
    expect(screen.getByText("resources.listChanged")).toBeInTheDocument();
    expect(screen.getByText("resources.subscribe")).toBeInTheDocument();
  });

  it("should not display disabled capabilities", () => {
    const serverInfo = {
      name: "DrupalMcpServer",
      version: "1.0.0",
      protocolVersion: "1.0",
      capabilities: {
        tools: { listChanged: false },
        prompts: { listChanged: false },
        resources: {
          listChanged: false,
          subscribe: false,
        },
      } as ServerCapabilities,
    };

    render(<ServerInfo info={serverInfo} />);

    expect(screen.queryByText("tools.listChanged")).not.toBeInTheDocument();
    expect(screen.queryByText("prompts.listChanged")).not.toBeInTheDocument();
    expect(screen.queryByText("resources.listChanged")).not.toBeInTheDocument();
    expect(screen.queryByText("resources.subscribe")).not.toBeInTheDocument();
  });

  it("should handle empty capabilities object", () => {
    const serverInfo = {
      name: "DrupalMcpServer",
      version: "1.0.0",
      protocolVersion: "1.0",
      capabilities: {} as ServerCapabilities,
    };

    render(<ServerInfo info={serverInfo} />);
    expect(screen.getByText("No capabilities available")).toBeInTheDocument();
  });

  it("should properly render capabilities from McpProvider", () => {
    render(
      <McpContext.Provider value={mockContextValue}>
        <ServerInfo info={mockContextValue.clients.testServer.serverInfo!} />
      </McpContext.Provider>
    );

    expect(screen.getByText("tools.listChanged")).toBeInTheDocument();
    expect(screen.getByText("prompts.listChanged")).toBeInTheDocument();
    expect(screen.getByText("resources.listChanged")).toBeInTheDocument();
  });

  it("should use default capabilities when server returns none", () => {
    const serverInfo = {
      name: "DrupalMcpServer",
      version: "1.0.0",
      protocolVersion: "1.0",
      capabilities: {} as ServerCapabilities,
    };

    render(<ServerInfo info={serverInfo} />);
    expect(screen.getByText("No capabilities available")).toBeInTheDocument();
  });
});
