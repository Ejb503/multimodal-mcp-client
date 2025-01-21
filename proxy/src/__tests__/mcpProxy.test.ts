import { vi, describe, it, expect, beforeEach } from "vitest";
import mcpProxy, { McpProxy } from "../mcpProxy.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { defaults } from "../config/defaults.js";
import type { McpConfig } from "../types/index.js";

// Mock the handlers
vi.mock("../handlers/mcpHandlers.js");
vi.mock("../handlers/configHandlers.js");
vi.mock("../handlers/transportHandlers.js");

// Mock console.log
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

// Helper function to flush promises
const flushPromises = () => new Promise((resolve) => setImmediate(resolve));

describe("mcpProxy function", () => {
  let mockClientTransport: Transport;
  let mockServerTransport: Transport;
  let mockError: (error: Error) => void;

  beforeEach(() => {
    mockClientTransport = {
      send: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      onmessage: null,
      onclose: null,
      onerror: null,
    } as unknown as Transport;

    mockServerTransport = {
      send: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      onmessage: null,
      onclose: null,
      onerror: null,
    } as unknown as Transport;

    mockError = vi.fn();

    // Mock console.log to reduce noise in tests
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("forwards messages from client to server", () => {
    mcpProxy({
      transportToClient: mockClientTransport,
      transportToServer: mockServerTransport,
      onerror: mockError,
    });

    const message = {
      jsonrpc: "2.0" as const,
      method: "test",
      id: "1",
    };
    mockClientTransport.onmessage!(message);

    expect(mockServerTransport.send).toHaveBeenCalledWith(message);
  });

  it("forwards messages from server to client", () => {
    mcpProxy({
      transportToClient: mockClientTransport,
      transportToServer: mockServerTransport,
      onerror: mockError,
    });

    const message = {
      jsonrpc: "2.0" as const,
      method: "test",
      id: "1",
    };
    mockServerTransport.onmessage!(message);

    expect(mockClientTransport.send).toHaveBeenCalledWith(message);
  });

  it("handles client transport close", () => {
    mcpProxy({
      transportToClient: mockClientTransport,
      transportToServer: mockServerTransport,
      onerror: mockError,
    });

    mockClientTransport.onclose!();

    expect(mockServerTransport.close).toHaveBeenCalled();
  });

  it("handles server transport close", () => {
    mcpProxy({
      transportToClient: mockClientTransport,
      transportToServer: mockServerTransport,
      onerror: mockError,
    });

    mockServerTransport.onclose!();

    expect(mockClientTransport.close).toHaveBeenCalled();
  });

  it("handles send errors", async () => {
    const error = new Error("Send failed");
    mockServerTransport.send = vi.fn().mockRejectedValue(error);

    mcpProxy({
      transportToClient: mockClientTransport,
      transportToServer: mockServerTransport,
      onerror: mockError,
    });

    const message = {
      jsonrpc: "2.0" as const,
      method: "test",
      id: "1",
    };
    mockClientTransport.onmessage!(message);

    await flushPromises();
    expect(mockError).toHaveBeenCalledWith(error);
  });

  it("handles close errors", async () => {
    const error = new Error("Close failed");
    mockServerTransport.close = vi.fn().mockRejectedValue(error);

    mcpProxy({
      transportToClient: mockClientTransport,
      transportToServer: mockServerTransport,
      onerror: mockError,
    });

    mockClientTransport.onclose!();

    await flushPromises();
    expect(mockError).toHaveBeenCalledWith(error);
  });
});

describe("McpProxy class", () => {
  it("initializes with default configuration", () => {
    const config: McpConfig = {
      mcpServers: {
        test: {
          command: "test",
        },
      },
    };

    const proxy = new McpProxy(config);
    expect(proxy).toBeDefined();
    expect(config.defaults).toEqual(defaults);
  });

  it("initializes with custom configuration", () => {
    const customDefaults = {
      ...defaults,
      port: 4000,
    };

    const config: McpConfig = {
      mcpServers: {
        test: {
          command: "test",
        },
      },
      defaults: customDefaults,
    };

    const proxy = new McpProxy(config);
    expect(proxy).toBeDefined();
    expect(config.defaults).toEqual(customDefaults);
  });
});
