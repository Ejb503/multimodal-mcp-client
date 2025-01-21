import { describe, it, expect, vi, beforeEach } from "vitest";
import { TransportManager, TransportType } from "../../transports/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { McpConfig } from "../../types/index.js";

// Mock implementations
const mockStdioTransport = {
  start: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  stderr: { on: vi.fn() },
};

const mockSseTransport = {
  start: vi.fn().mockResolvedValue(undefined),
  close: vi.fn().mockResolvedValue(undefined),
  send: vi.fn(),
};

vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
  StdioClientTransport: vi.fn().mockImplementation(() => mockStdioTransport),
}));

vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
  SSEClientTransport: vi.fn().mockImplementation(() => mockSseTransport),
}));

describe("TransportManager", () => {
  let manager: TransportManager;
  const mockConfig: McpConfig = {
    mcpServers: {
      default: {
        command: "test-command",
        args: ["--test"],
        env: {
          "0": "SYSTEMPROMPT_API_KEY",
        },
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new TransportManager(mockConfig);
    mockStdioTransport.start.mockResolvedValue(undefined);
    mockSseTransport.start.mockResolvedValue(undefined);
  });

  describe("validateTransportParams", () => {
    it("should validate stdio transport type", () => {
      const result = manager.validateTransportParams({
        transportType: "stdio" as TransportType,
        serverId: "default",
      });

      expect(result.transportType).toBe("stdio");
      expect(result.serverId).toBe("default");
    });

    it("should validate sse transport type", () => {
      const result = manager.validateTransportParams({
        transportType: "sse" as TransportType,
        serverId: "custom",
      });

      expect(result.transportType).toBe("sse");
      expect(result.serverId).toBe("custom");
    });

    it("should use default serverId if not provided", () => {
      const result = manager.validateTransportParams({
        transportType: "stdio" as TransportType,
      });

      expect(result.serverId).toBe("default");
    });

    it("should throw error for invalid transport type", () => {
      expect(() =>
        manager.validateTransportParams({
          transportType: "invalid" as TransportType,
        })
      ).toThrow("Invalid transport type specified");
    });
  });

  describe("createTransport", () => {
    it("should create stdio transport", async () => {
      const transport = await manager.createTransport({
        transportType: "stdio" as TransportType,
        serverId: "default",
      });

      expect(transport).toBe(mockStdioTransport);
      expect(StdioClientTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "test-command",
          args: ["--test"],
        })
      );
    });

    it("should create sse transport", async () => {
      const mockConfig: McpConfig = {
        mcpServers: {
          default: {
            command: "test-command",
            args: ["--test"],
          },
        },
        sse: {
          systemprompt: {
            url: "https://test.com",
            apiKey: "test-key",
          },
        },
      };
      const manager = new TransportManager(mockConfig);

      const transport = await manager.createTransport({
        transportType: "sse" as TransportType,
        serverId: "default",
      });

      expect(transport).toBe(mockSseTransport);
      expect(SSEClientTransport).toHaveBeenCalledWith(expect.any(URL));
    });

    it("should throw error for missing SSE config", async () => {
      await expect(
        manager.createTransport({
          transportType: "sse" as TransportType,
          serverId: "default",
        })
      ).rejects.toThrow("SSE configuration is not available");
    });

    it("should throw error for missing server config", async () => {
      await expect(
        manager.createTransport({
          transportType: "stdio" as TransportType,
          serverId: "nonexistent",
        })
      ).rejects.toThrow("No configuration found for server: nonexistent");
    });

    it("should create transport with environment variables", async () => {
      const originalEnv = process.env;
      process.env = { ...originalEnv, SYSTEMPROMPT_API_KEY: "test-key" };

      const transport = await manager.createTransport({
        transportType: "stdio" as TransportType,
        serverId: "default",
      });

      expect(transport).toBe(mockStdioTransport);
      expect(StdioClientTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          env: expect.objectContaining({
            SYSTEMPROMPT_API_KEY: "test-key",
          }),
        })
      );

      process.env = originalEnv;
    });

    it("should handle transport start failure", async () => {
      const mockError = new Error("Failed to start transport");
      mockStdioTransport.start.mockRejectedValueOnce(mockError);

      await expect(
        manager.createTransport({
          transportType: "stdio" as TransportType,
          serverId: "default",
        })
      ).rejects.toThrow(mockError);
    });

    it("should handle SSE transport start failure", async () => {
      const mockConfig: McpConfig = {
        mcpServers: {
          default: {
            command: "test-command",
            args: ["--test"],
          },
        },
        sse: {
          systemprompt: {
            url: "https://test.com",
            apiKey: "test-key",
          },
        },
      };
      const manager = new TransportManager(mockConfig);

      const mockError = new Error("Failed to start SSE transport");
      mockSseTransport.start.mockRejectedValueOnce(mockError);

      await expect(
        manager.createTransport({
          transportType: "sse" as TransportType,
          serverId: "default",
        })
      ).rejects.toThrow(mockError);
    });
  });
});
