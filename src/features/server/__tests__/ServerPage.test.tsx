import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ServerPage } from "@/pages/ServerPage";
import { useParams } from "react-router-dom";
import { useMcp } from "@/contexts/McpContext";
import { useServer } from "@/features/server/hooks/useServer";
import type {
  McpContextType,
  McpClientState,
} from "@/contexts/McpContext.types";

vi.mock("react-router-dom", () => ({
  useParams: vi.fn(),
}));

vi.mock("@/contexts/McpContext", () => ({
  useMcp: vi.fn(),
}));

vi.mock("@/features/server/hooks/useServer", () => ({
  useServer: vi.fn(),
}));

const mockUseParams = vi.mocked(useParams);
const mockUseMcp = vi.mocked(useMcp);
const mockUseServer = vi.mocked(useServer);

const mockMcpContext: McpContextType = {
  clients: {
    "test-server": {
      connectionStatus: "connected",
      serverInfo: {
        name: "Test Server",
        version: "1.0.0",
        protocolVersion: "v1",
        capabilities: {},
      },
    } as McpClientState,
  },
  activeClients: ["test-server"],
  connectServer: vi.fn(),
  disconnectServer: vi.fn(),
  listTools: vi.fn(),
  executeTool: vi.fn(),
  listPrompts: vi.fn(),
  selectPrompt: vi.fn(),
  listResources: vi.fn(),
  executePrompt: vi.fn(),
  readResource: vi.fn(),
};

const mockServerState = {
  isConnected: true,
  isConnecting: false,
  hasError: false,
  error: null,
  tools: [],
  prompts: [],
  resources: [],
  hasListToolsCapability: false,
  hasListPromptsCapability: false,
  hasListResourcesCapability: false,
  serverInfo: {
    name: "Test Server",
    version: "1.0.0",
    protocolVersion: "v1",
    capabilities: {},
  },
};

const mockServerActions = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  fetchTools: vi.fn(),
  executeTool: vi.fn(),
  fetchPrompts: vi.fn(),
  selectPrompt: vi.fn(),
  getPromptDetails: vi.fn(),
  executePrompt: vi.fn(),
  fetchResources: vi.fn(),
  readResource: vi.fn(),
};

describe("ServerPage", () => {
  beforeEach(() => {
    mockUseParams.mockReturnValue({ serverId: "test-server" });
    mockUseMcp.mockReturnValue(mockMcpContext);
    mockUseServer.mockReturnValue({
      state: mockServerState,
      actions: mockServerActions,
    });
  });

  it("displays server information when connected", () => {
    render(<ServerPage />);
    expect(screen.getByText("Test Server")).toBeInTheDocument();
    expect(screen.getByText("test-server")).toBeInTheDocument();
  });

  it("shows server not found when serverId is missing", () => {
    mockUseParams.mockReturnValue({});
    render(<ServerPage />);
    expect(screen.getByText("Server Not Found")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    mockUseServer.mockReturnValue({
      state: { ...mockServerState, isConnecting: true, isConnected: false },
      actions: mockServerActions,
    });
    render(<ServerPage />);
    const connectButton = screen.getByRole("button", { name: /connect/i });
    expect(connectButton).toBeInTheDocument();
    expect(connectButton).toHaveAttribute("data-loading", "true");
  });

  it("shows error state", () => {
    mockUseServer.mockReturnValue({
      state: { ...mockServerState, hasError: true, isConnected: false },
      actions: mockServerActions,
    });
    render(<ServerPage />);
    expect(screen.getByText("Connection Error")).toBeInTheDocument();
    expect(
      screen.getByText("Failed to connect to server. Tools are unavailable.")
    ).toBeInTheDocument();
  });

  it("shows disconnected state", () => {
    mockUseServer.mockReturnValue({
      state: { ...mockServerState, isConnected: false },
      actions: mockServerActions,
    });
    render(<ServerPage />);
    expect(screen.getByText("Connect")).toBeInTheDocument();
  });
});
