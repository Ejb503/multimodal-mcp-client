import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { McpContext } from "../../contexts/McpContext";
import { useMcpSampling } from "../useMcpSampling";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type {
  CreateMessageRequest,
  CreateMessageResult,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import * as React from "react";

describe("useMcpSampling", () => {
  const mockClient = {
    notification: vi.fn().mockResolvedValue(undefined),
  } as unknown as Client;

  const mockClients = {
    testServer: {
      client: mockClient,
      connectionStatus: "connected" as const,
      serverType: "stdio" as const,
      serverUrl: "",
      apiKey: "",
      resources: [],
      prompts: [],
      tools: [],
      loadedResources: [],
    },
  };

  const mockContextValue = {
    clients: mockClients,
    activeClients: ["testServer"],
    connectServer: vi.fn(),
    disconnectServer: vi.fn(),
    selectPrompt: vi.fn(),
    listResources: vi.fn(),
    listPrompts: vi.fn(),
    listTools: vi.fn(),
    executeTool: vi.fn(),
    executePrompt: vi.fn(),
    readResource: vi.fn(),
    requestSampling: vi.fn(),
    pendingSampleRequests: [],
    handleApproveSampling: vi.fn(),
    handleRejectSampling: vi.fn(),
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <McpContext.Provider value={mockContextValue}>
      {children}
    </McpContext.Provider>
  );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createTestRequest = (): CreateMessageRequest["params"] => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: "test message",
        } as TextContent,
      },
    ],
    maxTokens: 100,
  });

  it("should create a sampling request", async () => {
    const { result } = renderHook(() => useMcpSampling(), { wrapper });

    const request = createTestRequest();
    const samplingPromise = result.current.requestSampling(
      "testServer",
      request
    );

    await waitFor(() => {
      expect(result.current.pendingSampleRequests.length).toBe(1);
    });

    expect(result.current.pendingSampleRequests[0].serverId).toBe("testServer");

    // Resolve the pending request to clean up
    await result.current.handleApproveSampling(0, {
      role: "assistant",
      content: { type: "text", text: "test" } as TextContent,
      model: "test",
    });

    await samplingPromise;
  });

  it("should handle approve sampling with progress notifications", async () => {
    const { result } = renderHook(() => useMcpSampling(), { wrapper });

    const response: CreateMessageResult = {
      role: "assistant",
      content: { type: "text", text: "Test response" } as TextContent,
      model: "test-model",
    };

    const request = createTestRequest();
    const samplingPromise = result.current.requestSampling(
      "testServer",
      request
    );

    await waitFor(() => {
      expect(result.current.pendingSampleRequests.length).toBe(1);
    });

    await result.current.handleApproveSampling(0, response);

    expect(mockClient.notification).toHaveBeenCalledWith({
      method: "notifications/progress",
      params: expect.objectContaining({
        progressToken: 0,
        progress: 0,
        total: 100,
        status: "Starting sampling process...",
      }),
    });

    expect(mockClient.notification).toHaveBeenCalledWith({
      method: "notifications/progress",
      params: expect.objectContaining({
        progressToken: 0,
        progress: 100,
        total: 100,
        status: "Sampling complete",
      }),
    });

    await samplingPromise;
  });

  it("should handle reject sampling", async () => {
    const { result } = renderHook(() => useMcpSampling(), { wrapper });

    const request = createTestRequest();
    const samplingPromise = result.current
      .requestSampling("testServer", request)
      .catch(() => {
        /* ignore rejection */
      });

    await waitFor(() => {
      expect(result.current.pendingSampleRequests.length).toBe(1);
    });

    result.current.handleRejectSampling(0);

    expect(mockClient.notification).toHaveBeenCalledWith({
      method: "notifications/progress",
      params: expect.objectContaining({
        progressToken: 0,
        progress: 0,
        total: 100,
        status: "Sampling rejected",
      }),
    });

    await samplingPromise;
  });
});
