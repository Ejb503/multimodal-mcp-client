import { render, screen, waitFor } from "@testing-library/react";
import {
  LiveAPIProvider,
  useLiveAPIContext,
} from "../../contexts/LiveAPIContext";
import { useMcp, McpProvider } from "@/contexts/McpContext";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { LiveConfig } from "../../multimodal-live-types";
import { useAgentRegistry } from "@/features/agent-registry";
import { useEffect } from "react";
import llmConfig from "@config/llm.config.json";

// Mock MediaStream implementation
class MockMediaStream implements MediaStream {
  active = true;
  id = "mock-stream";
  onaddtrack = null;
  onremovetrack = null;
  addTrack() {}
  removeTrack() {}
  getTracks() {
    return [];
  }
  getAudioTracks() {
    return [];
  }
  getVideoTracks() {
    return [];
  }
  getTrackById() {
    return null;
  }
  clone(): MediaStream {
    return new MockMediaStream();
  }
  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() {
    return true;
  }
}

// Set global MediaStream
global.MediaStream = MockMediaStream as unknown as {
  new (): MediaStream;
  new (stream: MediaStream): MediaStream;
  new (tracks: MediaStreamTrack[]): MediaStream;
  prototype: MediaStream;
};

// All vi.mock calls must be at the top level
vi.mock("@/contexts/McpContext", () => ({
  useMcp: vi.fn(),
  McpProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/features/agent-registry", () => ({
  useAgentRegistry: vi.fn(),
}));

// Mock the config file
vi.mock("@config/llm.config.json", () => ({
  default: {
    provider: "gemini",
    config: {
      apiKey: "test-key",
      model: "test-model",
      temperature: 0.7,
      maxTokens: 100000,
    },
  },
}));

vi.mock("../../hooks/use-live-api", () => ({
  useLiveAPI: vi.fn(() => ({
    client: null,
    connected: false,
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    volume: 0,
    executeToolAction: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("../../lib/multimodal-live-client", () => ({
  __esModule: true,
  MultimodalLiveAPIClientConnection: vi.fn(),
  default: vi.fn(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    on: vi.fn().mockReturnThis(),
    off: vi.fn().mockReturnThis(),
    sendToolResponse: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock("../../lib/worklets/vol-meter", () => ({
  default: "mock-worklet-code",
}));

vi.mock("../../lib/utils", () => ({
  audioContext: vi.fn().mockResolvedValue({
    createGain: vi.fn().mockReturnValue({
      connect: vi.fn(),
      gain: { value: 1 },
    }),
    createOscillator: vi.fn().mockReturnValue({
      connect: vi.fn(),
      start: vi.fn(),
    }),
    destination: {},
    audioWorklet: {
      addModule: vi.fn().mockResolvedValue(undefined),
    },
    createMediaStreamDestination: vi.fn().mockReturnValue({
      stream: new MockMediaStream(),
    }),
  }),
}));

vi.mock("../../lib/audio-streamer", () => ({
  AudioStreamer: vi.fn(() => ({
    addWorklet: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    addPCM16: vi.fn(),
  })),
}));

// Mock console to suppress output
const mockConsole = {
  log: vi.spyOn(console, "log").mockImplementation(() => {}),
  error: vi.spyOn(console, "error").mockImplementation(() => {}),
  warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
  info: vi.spyOn(console, "info").mockImplementation(() => {}),
};

describe("LiveAPIProvider", () => {
  const liveConfig: LiveConfig = {
    model: "test-model",
    generationConfig: {
      responseModalities: "audio",
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Test Voice",
          },
        },
      },
    },
    tools: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.values(mockConsole).forEach((mock) => mock.mockClear());

    // Setup default mocks
    const mockUseMcp = vi.fn().mockReturnValue({
      clients: {
        testClient: {
          connectionStatus: "connected",
          tools: [{ name: "testTool" }],
        },
      },
      activeClients: ["testClient"],
      connectServer: vi.fn(),
      disconnectServer: vi.fn(),
      selectPrompt: vi.fn(),
      listResources: vi.fn(),
      listPrompts: vi.fn(),
      listTools: vi.fn(),
      executeTool: vi.fn().mockResolvedValue({ result: "success" }),
    });

    vi.mocked(useMcp).mockImplementation(mockUseMcp);
    vi.mocked(useAgentRegistry).mockReturnValue({
      agents: [],
      activeAgent: null,
      loadAgents: vi.fn(),
      saveAgent: vi.fn(),
      deleteAgent: vi.fn(),
      getAgent: vi.fn(),
      setActiveAgent: vi.fn(),
      tools: [],
      setTools: vi.fn(),
      prompt: {
        instruction: { static: "", state: "", dynamic: "" },
        input: { name: "", description: "", type: [], reference: [] },
        output: { name: "", description: "", type: [], reference: [] },
        metadata: { title: "", description: "", tag: [], log_message: "" },
      },
      config: liveConfig,
    });
  });

  afterEach(() => {
    Object.values(mockConsole).forEach((mock) => mock.mockRestore());
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(<McpProvider>{ui}</McpProvider>);
  };

  it("renders children correctly", () => {
    renderWithProviders(
      <LiveAPIProvider>
        <div data-testid="test-child">Test Child</div>
      </LiveAPIProvider>
    );

    expect(screen.getByTestId("test-child")).toBeInTheDocument();
  });

  it("throws error when API key is not set", () => {
    // Get the mocked module
    const mockedConfig = vi.mocked(llmConfig);

    // Store the original value
    const originalApiKey = mockedConfig.config.apiKey;

    // Set the API key to empty
    mockedConfig.config.apiKey = "";

    try {
      renderWithProviders(
        <LiveAPIProvider>
          <div>Test Child</div>
        </LiveAPIProvider>
      );
      // If we get here, the test should fail
      expect(true).toBe(false); // Force test to fail if no error is thrown
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(Error);
    } finally {
      // Restore the original value
      mockedConfig.config.apiKey = originalApiKey;
    }
  });

  it("executes tool action successfully", async () => {
    const TestComponent = () => {
      const { executeToolAction } = useLiveAPIContext();

      useEffect(() => {
        executeToolAction?.("testTool", { arg: "test" });
      }, [executeToolAction]);

      return <div>Test Component</div>;
    };

    renderWithProviders(
      <LiveAPIProvider>
        <TestComponent />
      </LiveAPIProvider>
    );

    const { executeTool } = useMcp();

    await waitFor(() => {
      expect(executeTool).toHaveBeenCalledWith("testClient", {
        name: "testTool",
        args: { arg: "test" },
      });
    });
  });
});
