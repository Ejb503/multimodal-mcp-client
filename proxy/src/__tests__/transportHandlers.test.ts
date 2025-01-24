import { Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { findActualExecutable } from "spawn-rx";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { TransportHandlers } from "../handlers/transportHandlers.js";
import type { McpConfig } from "../types/index.js";
import mcpProxy from "../mcpProxy.js";

// Mock dependencies
vi.mock("@modelcontextprotocol/sdk/server/sse.js");
vi.mock("@modelcontextprotocol/sdk/client/stdio.js");
vi.mock("@modelcontextprotocol/sdk/client/sse.js");
vi.mock("spawn-rx");
vi.mock("../mcpProxy.js");

describe("TransportHandlers", () => {
  let transportHandlers: TransportHandlers;
  let mockConfig: McpConfig;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockSSEServerTransport: SSEServerTransport;
  let mockStdioClientTransport: StdioClientTransport;
  let mockSSEClientTransport: SSEClientTransport;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Setup mock config
    mockConfig = {
      mcpServers: {
        default: {
          command: "test-command",
          args: ["--test"],
          env: { TEST_ENV: "test" },
        },
      },
      sse: {
        systemprompt: {
          url: "http://test.com",
          apiKey: "test-key",
        },
      },
    };

    // Setup mock request and response
    mockReq = {
      query: {
        transportType: "stdio",
        serverId: "default",
      },
      on: vi.fn(),
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      headersSent: false,
      end: vi.fn().mockReturnThis(),
    };

    // Setup mock transports
    mockSSEServerTransport = {
      start: vi.fn().mockResolvedValue(undefined),
      send: vi.fn(),
      close: vi.fn(),
    } as unknown as SSEServerTransport;

    mockStdioClientTransport = {
      start: vi.fn(() => Promise.reject(new Error("Transport start failed"))),
      stderr: {
        on: vi.fn(),
      },
    } as unknown as StdioClientTransport;

    mockSSEClientTransport = {
      start: vi.fn().mockResolvedValue(undefined),
    } as unknown as SSEClientTransport;

    // Mock transport constructors
    vi.mocked(SSEServerTransport).mockImplementation(
      () => mockSSEServerTransport
    );
    vi.mocked(StdioClientTransport).mockImplementation(
      () => mockStdioClientTransport
    );
    vi.mocked(SSEClientTransport).mockImplementation(
      () => mockSSEClientTransport
    );

    // Mock findActualExecutable
    vi.mocked(findActualExecutable).mockReturnValue({
      cmd: "test-command",
      args: ["--test"],
    });

    // Create instance
    transportHandlers = new TransportHandlers(mockConfig);
  });

  describe("handleSSE", () => {
    it("should successfully handle SSE connection with stdio transport", async () => {
      // Override the failed start for this test
      mockStdioClientTransport.start = vi.fn().mockResolvedValue(undefined);

      await transportHandlers.handleSSE(
        mockReq as Request,
        mockRes as Response
      );

      expect(StdioClientTransport).toHaveBeenCalledWith({
        command: "test-command",
        args: ["--test"],
        env: expect.any(Object),
        stderr: "pipe",
      });

      expect(SSEServerTransport).toHaveBeenCalledWith("/message", mockRes);
      expect(mockSSEServerTransport.start).toHaveBeenCalled();
      expect(mockSSEServerTransport.send).toHaveBeenCalledWith({
        jsonrpc: "2.0",
        method: "connection/ready",
        params: {},
      });
      expect(mcpProxy).toHaveBeenCalledWith(
        expect.objectContaining({
          transportToClient: mockSSEServerTransport,
          transportToServer: mockStdioClientTransport,
        })
      );
    });

    it("should handle SSE connection with SSE transport", async () => {
      mockReq.query = { transportType: "sse", serverId: "default" };
      process.env.SYSTEMPROMPT_API_KEY = "test-key";

      await transportHandlers.handleSSE(
        mockReq as Request,
        mockRes as Response
      );

      expect(SSEClientTransport).toHaveBeenCalledWith(
        expect.any(URL),
        expect.objectContaining({
          requestInit: {
            headers: {
              "api-key": "test-key",
            },
          },
        })
      );
      expect(mockSSEServerTransport.send).toHaveBeenCalledWith({
        jsonrpc: "2.0",
        method: "connection/ready",
        params: {},
      });
    });

    it("should handle transport start failure", async () => {
      await transportHandlers.handleSSE(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Transport start failed",
      });
    });

    it("should handle invalid transport type", async () => {
      mockReq.query = { transportType: "invalid", serverId: "default" };

      await transportHandlers.handleSSE(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: "Invalid transport type specified",
      });
    });
  });

  describe("handleMessage", () => {
    it("should reject requests without session ID", async () => {
      mockReq.query = {};

      await transportHandlers.handleMessage(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.end).toHaveBeenCalledWith("Session ID must be specified");
    });
  });
});
