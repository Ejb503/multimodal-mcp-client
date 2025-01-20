import { renderHook, act, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { usePrompts } from "../usePrompts";
import { McpContext } from "../../../../contexts/McpContext";
import type {
  McpContextType,
  McpClientState,
} from "../../../../contexts/McpContext.types";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { GlobalLlmProvider } from "../../../../contexts/LlmProviderContext";
import { LlmRegistryProvider } from "../../../../features/llm-registry/contexts/LlmRegistryContext";
import { McpDataProvider } from "../../../../contexts/McpDataContext";

vi.mock("../../../../contexts/LlmProviderContext", () => ({
  GlobalLlmProvider: ({ children }: { children: React.ReactNode }) => children,
  useGlobalLlm: () => ({
    executePrompt: vi.fn(),
    isLoading: false,
    error: null,
  }),
}));

const mockPrompt = {
  name: "test-prompt",
  description: "A test prompt",
  arguments: [
    {
      name: "param1",
      description: "A test parameter",
      required: false,
    },
  ],
};

const mockPromptDetails = {
  name: "test-prompt",
  description: "A test prompt",
  arguments: { "0": "" },
  messages: [],
};

describe("usePrompts", () => {
  let result: { current: ReturnType<typeof usePrompts> };
  let mockClient: Client;

  beforeEach(() => {
    mockClient = {
      prompts: [mockPrompt],
      getPrompt: vi.fn().mockResolvedValue(mockPromptDetails),
      _clientInfo: {},
      _capabilities: {},
      assertCapability: vi.fn(),
      connect: vi.fn(),
      disconnect: vi.fn(),
      listPrompts: vi.fn(),
      listTools: vi.fn(),
      getTool: vi.fn(),
      executeTool: vi.fn(),
      getResource: vi.fn(),
      readResource: vi.fn(),
      requestSampling: vi.fn(),
      getServerCapabilities: vi.fn(),
      getServerVersion: vi.fn(),
      assertCapabilityForMethod: vi.fn(),
      assertNotificationCapability: vi.fn(),
    } as unknown as Client;

    const mockClientState: McpClientState = {
      client: mockClient,
      connectionStatus: "connected",
      serverType: "stdio",
      serverUrl: "http://localhost:3000",
      apiKey: "test-key",
      resources: [],
      prompts: [mockPrompt],
      tools: [],
      loadedResources: [],
    };

    const mockContext: Partial<McpContextType> = {
      clients: {
        "test-server": mockClientState,
      },
      activeClients: ["test-server"],
      connectServer: vi.fn(),
      disconnectServer: vi.fn(),
      selectPrompt: vi.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LlmRegistryProvider>
        <GlobalLlmProvider>
          <McpDataProvider>
            <McpContext.Provider value={mockContext as McpContextType}>
              {children}
            </McpContext.Provider>
          </McpDataProvider>
        </GlobalLlmProvider>
      </LlmRegistryProvider>
    );

    const rendered = renderHook(() => usePrompts("test-server"), { wrapper });
    result = rendered.result;
  });

  it("handles execute prompt correctly", async () => {
    await act(async () => {
      await result.current.selectPrompt(mockPrompt);
    });

    // After selectPrompt, the prompt should be selected and modal opened
    expect(result.current.selectedPrompt).toEqual({
      name: mockPrompt.name,
      description: mockPrompt.description,
      arguments: mockPrompt.arguments,
      messages: [],
    });
    expect(result.current.isModalOpen).toBe(true);

    // Now test fetching with arguments
    await act(async () => {
      await result.current.fetchPromptWithArguments();
    });

    // After fetching with arguments, we should have the full prompt details
    expect(mockClient.getPrompt).toHaveBeenCalledWith({
      name: "test-prompt",
      arguments: { "0": "" },
    });
    expect(result.current.selectedPrompt).toEqual(mockPromptDetails);
  });

  it("handles view prompt correctly", async () => {
    await act(async () => {
      await result.current.selectPrompt(mockPrompt);
    });

    // After selectPrompt, the prompt should be selected and modal opened
    expect(result.current.selectedPrompt).toEqual({
      name: mockPrompt.name,
      description: mockPrompt.description,
      arguments: mockPrompt.arguments,
      messages: [],
    });
    expect(result.current.isModalOpen).toBe(true);

    // Now test fetching with arguments
    await act(async () => {
      await result.current.fetchPromptWithArguments();
    });

    // After fetching with arguments, we should have the full prompt details
    expect(mockClient.getPrompt).toHaveBeenCalledWith({
      name: "test-prompt",
      arguments: { "0": "" },
    });
    expect(result.current.selectedPrompt).toEqual(mockPromptDetails);
  });

  it("handles loading state correctly", async () => {
    // Select a prompt first
    await act(async () => {
      result.current.selectPrompt(mockPrompt);
    });

    // Mock a delay in getPrompt to ensure loading state is visible
    mockClient.getPrompt = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return mockPromptDetails;
    });

    // Start the fetch
    let fetchPromise: Promise<void>;
    await act(async () => {
      fetchPromise = result.current.fetchPromptWithArguments();
    });

    // Wait for loading state to be true
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });

    // Wait for fetch to complete
    await act(async () => {
      await fetchPromise;
    });

    // Loading should be false after fetch completes
    expect(result.current.isLoading).toBe(false);
  });
});
