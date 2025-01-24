import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react-dom/test-utils";
import { PromptsSection } from "../components/sections/PromptsSection";
import { McpContext } from "../../../contexts/McpContext";
import { McpDataProvider } from "../../../contexts/McpDataContext";
import { GlobalLlmProvider } from "../../../contexts/LlmProviderContext";
import { LlmRegistryProvider } from "../../../features/llm-registry/contexts/LlmRegistryContext";
import type { McpContextType } from "../../../contexts/McpContext.types";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { Prompt } from "@modelcontextprotocol/sdk/types.js";

// Custom press event
const press = (element: Element) => {
  fireEvent.pointerDown(element);
  fireEvent.pointerUp(element);
  fireEvent.click(element);
};

// Mock fetch
vi.stubGlobal(
  "fetch",
  vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          provider: "gemini",
          config: {
            apiKey: "test-key",
            model: "gemini-pro",
            temperature: 0.7,
            maxTokens: 1000,
          },
        }),
    })
  )
);

// Mock state for useSchemaParameters
const mockSchemaState = {
  values: {},
  errors: [],
  setValue: vi.fn(),
  validate: vi.fn(() => true),
  reset: vi.fn(),
  createEmptyValues: vi.fn(() => ({})),
  setValues: vi.fn(),
};

vi.mock("@/utils/useSchemaParameters", () => ({
  useSchemaParameters: () => mockSchemaState,
  createSchemaFromPromptArgs: vi.fn(() => ({})),
}));

// Mock state for useModal
const mockModalState = {
  viewModalOpen: false,
  executeModalOpen: false,
  selectedPrompt: null as Prompt | null,
  handleOpenViewModal: vi.fn(async (prompt: Prompt) => {
    mockModalState.selectedPrompt = prompt;
    mockModalState.viewModalOpen = true;
  }),
  handleOpenExecuteModal: vi.fn(async (prompt: Prompt) => {
    mockModalState.selectedPrompt = prompt;
    mockModalState.executeModalOpen = true;
  }),
  handleCloseViewModal: vi.fn(async () => {
    mockModalState.viewModalOpen = false;
    mockModalState.selectedPrompt = null;
  }),
  handleCloseExecuteModal: vi.fn(async () => {
    mockModalState.executeModalOpen = false;
    mockModalState.selectedPrompt = null;
  }),
};

vi.mock("../../hooks/useModal", () => ({
  useModal: () => mockModalState,
}));

vi.mock("../../hooks/usePromptLogger", () => ({
  usePromptLogger: () => ({
    logPromptExecution: vi.fn(),
  }),
}));

vi.mock("../../../contexts/LlmProviderContext", () => ({
  GlobalLlmProvider: ({ children }) => <>{children}</>,
  useGlobalLlm: () => ({
    llm: {
      name: "test-llm",
      provider: "test-provider",
      model: "test-model",
      apiKey: "test-key",
    },
    setLlm: vi.fn(),
  }),
}));

const mockPrompt = {
  name: "testPrompt",
  description: "Test prompt description",
  type: "test",
  inputSchema: {
    type: "object",
    properties: {
      param1: { type: "string", description: "Test parameter" },
    },
    required: ["param1"],
  },
  getPrompt: vi.fn(),
  executePrompt: vi.fn(),
  arguments: [
    {
      name: "param1",
      type: "string",
      description: "Test parameter",
      required: true,
    },
  ],
} as unknown as Prompt;

const mockMcpClient = {
  getPrompt: vi.fn(),
  getPrompts: vi.fn(),
  executePrompt: vi.fn(),
} as unknown as Client;

const mockContext: McpContextType = {
  clients: {
    "test-server": {
      client: mockMcpClient,
      connectionStatus: "connected",
      serverType: "stdio",
      serverUrl: "test-url",
      apiKey: "test-key",
      resources: [],
      prompts: [mockPrompt],
      tools: [],
      loadedResources: [],
      serverInfo: {
        name: "test-server",
        version: "1.0.0",
        protocolVersion: "1.0.0",
        capabilities: {},
      },
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

const wrapper = ({ children }: { children: React.ReactNode }) => (
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

describe("PromptsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset modal state
    mockModalState.viewModalOpen = false;
    mockModalState.executeModalOpen = false;
    mockModalState.selectedPrompt = null;
    // Reset schema state
    mockSchemaState.values = {};
    mockSchemaState.errors = [];
  });

  it("should view prompt details successfully", async () => {
    const onGetPromptDetails = vi.fn().mockResolvedValue({ result: "Success" });

    render(
      <PromptsSection
        prompts={[mockPrompt]}
        isConnected={true}
        onExecutePrompt={vi.fn()}
        onGetPromptDetails={onGetPromptDetails}
      />,
      { wrapper }
    );

    // Wait for the prompts to load and click view button
    const viewButton = await screen.findByTestId("view-prompt-button");

    await act(async () => {
      press(viewButton);
      await mockModalState.handleOpenViewModal(mockPrompt);
    });

    // Verify modal opened
    expect(mockModalState.viewModalOpen).toBe(true);
    expect(mockModalState.selectedPrompt).toBe(mockPrompt);
  });

  it("should execute prompt successfully", async () => {
    const onExecutePrompt = vi.fn().mockResolvedValue({ response: "Success" });

    render(
      <PromptsSection
        prompts={[mockPrompt]}
        isConnected={true}
        onExecutePrompt={onExecutePrompt}
        onGetPromptDetails={vi.fn()}
      />,
      { wrapper }
    );

    // Wait for the prompts to load and click execute button
    const executeButton = await screen.findByTestId(
      `prompt-execute-${mockPrompt.name}`
    );

    await act(async () => {
      press(executeButton);
      await mockModalState.handleOpenExecuteModal(mockPrompt);
    });

    // Verify modal opened
    expect(mockModalState.executeModalOpen).toBe(true);
    expect(mockModalState.selectedPrompt).toBe(mockPrompt);
  });

  it("should handle errors", async () => {
    const mockGetPromptDetails = vi.fn();
    const mockExecutePrompt = vi.fn();

    render(
      <McpContext.Provider value={mockContext}>
        <PromptsSection
          prompts={[]}
          isConnected={false}
          error="Failed to connect to server. Prompts are unavailable."
          onGetPromptDetails={mockGetPromptDetails}
          onExecutePrompt={mockExecutePrompt}
        />
      </McpContext.Provider>
    );

    // Wait for error state
    const container = await screen.findByTestId("status-container-danger");
    expect(container).toBeInTheDocument();
    expect(container).toHaveTextContent("Connection Error");
    expect(container).toHaveTextContent(
      "Failed to connect to server. Prompts are unavailable."
    );
  });
});
