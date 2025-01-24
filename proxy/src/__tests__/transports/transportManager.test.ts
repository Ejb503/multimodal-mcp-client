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
    available: {},
    defaults: {
      serverTypes: {
        stdio: {
          icon: "test-icon",
          color: "primary",
          description: "Test stdio server",
        },
        sse: {
          icon: "test-icon",
          color: "primary",
          description: "Test SSE server",
        },
      },
      unconnected: {
        icon: "test-icon",
        color: "secondary",
        description: "Test unconnected server",
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
      process.env.SYSTEMPROMPT_API_KEY = "test-key";
      const mockConfig: McpConfig = {
        mcpServers: {
          default: {
            command: "test-command",
            args: ["--test"],
          },
        },
        available: {},
        defaults: {
          serverTypes: {
            stdio: {
              icon: "test-icon",
              color: "primary",
              description: "Test stdio server",
            },
            sse: {
              icon: "test-icon",
              color: "primary",
              description: "Test SSE server",
            },
          },
          unconnected: {
            icon: "test-icon",
            color: "secondary",
            description: "Test unconnected server",
          },
        },
      };
      const manager = new TransportManager(mockConfig);

      const transport = await manager.createTransport({
        transportType: "sse" as TransportType,
        serverId: "default",
      });

      expect(transport).toBe(mockSseTransport);
      expect(SSEClientTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: "api.systemprompt.io",
          pathname: "/v1/mcp/sse",
          searchParams: expect.any(URLSearchParams),
        })
      );
    });

    it("should throw error for missing API key", async () => {
      delete process.env.SYSTEMPROMPT_API_KEY;
      await expect(
        manager.createTransport({
          transportType: "sse" as TransportType,
          serverId: "default",
        })
      ).rejects.toThrow("API key not configured");
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

      const mockConfig: McpConfig = {
        mcpServers: {
          "test-server": {
            command: "test-command",
            args: ["--test"],
            env: {
              TEST_ENV: "test-value",
            },
          },
        },
        available: {},
        defaults: {
          serverTypes: {
            stdio: {
              icon: "test-icon",
              color: "primary",
              description: "Test stdio server",
            },
            sse: {
              icon: "test-icon",
              color: "primary",
              description: "Test SSE server",
            },
          },
          unconnected: {
            icon: "test-icon",
            color: "secondary",
            description: "Test unconnected server",
          },
        },
      };

      const manager = new TransportManager(mockConfig);

      const transport = await manager.createTransport({
        transportType: "stdio" as TransportType,
        serverId: "test-server",
      });

      expect(transport).toBe(mockStdioTransport);
      expect(StdioClientTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          command: "test-command",
          args: ["--test"],
          env: {
            TEST_ENV: "test-value",
          },
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
      process.env.SYSTEMPROMPT_API_KEY = "test-key";
      const mockConfig: McpConfig = {
        mcpServers: {
          default: {
            command: "test-command",
            args: ["--test"],
          },
        },
        available: {},
        defaults: {
          serverTypes: {
            stdio: {
              icon: "test-icon",
              color: "primary",
              description: "Test stdio server",
            },
            sse: {
              icon: "test-icon",
              color: "primary",
              description: "Test SSE server",
            },
          },
          unconnected: {
            icon: "test-icon",
            color: "secondary",
            description: "Test unconnected server",
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

    it("should throw error when server command is missing", async () => {
      const config: McpConfig = {
        mcpServers: {
          "test-server": {
            command: undefined as unknown as string,
            args: ["--test"],
            env: { TEST_ENV: "test-value" },
          },
        },
        available: {},
        defaults: {
          serverTypes: {
            stdio: {
              icon: "test-icon",
              color: "primary",
              description: "Test stdio server",
            },
            sse: {
              icon: "test-icon",
              color: "primary",
              description: "Test SSE server",
            },
          },
          unconnected: {
            icon: "test-icon",
            color: "secondary",
            description: "Test unconnected server",
          },
        },
      };
      const manager = new TransportManager(config);

      await expect(
        manager.createTransport({
          transportType: "stdio",
          serverId: "test-server",
        })
      ).rejects.toThrow("Server command is required for stdio transport");
    });

    it("should throw error when server command is empty", async () => {
      const config: McpConfig = {
        mcpServers: {
          "test-server": {
            command: "",
            args: ["--test"],
            env: { TEST_ENV: "test-value" },
          },
        },
        available: {},
        defaults: {
          serverTypes: {
            stdio: {
              icon: "test-icon",
              color: "primary",
              description: "Test stdio server",
            },
            sse: {
              icon: "test-icon",
              color: "primary",
              description: "Test SSE server",
            },
          },
          unconnected: {
            icon: "test-icon",
            color: "secondary",
            description: "Test unconnected server",
          },
        },
      };
      const manager = new TransportManager(config);

      await expect(
        manager.createTransport({
          transportType: "stdio",
          serverId: "test-server",
        })
      ).rejects.toThrow("Server command is required for stdio transport");
    });
  });
});
