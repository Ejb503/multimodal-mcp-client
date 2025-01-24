import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ConfigHandlers } from "../../handlers/configHandlers.js";
import type { Request, Response } from "express";
import type { McpConfig } from "../../types/index.js";

describe("ConfigHandlers", () => {
  let handlers: ConfigHandlers;
  const mockConfig: McpConfig = {
    mcpServers: {
      default: {
        command: "test-command",
        args: ["--test"],
      },
    },
    customServers: {
      "custom-test": {
        command: "custom-command",
        args: ["--custom"],
      },
    },
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

  const originalEnv = process.env;

  const createMockResponse = () => ({
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
    end: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    handlers = new ConfigHandlers(mockConfig);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("handleConfig", () => {
    it("should return merged configuration with custom servers", async () => {
      const req = {} as Request;
      const res = createMockResponse();

      handlers.handleConfig(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        mcpServers: {
          default: {
            command: "test-command",
            args: ["--test"],
          },
          "custom-test": {
            command: "custom-command",
            args: ["--custom"],
          },
        },
      });
    });

    it("should handle missing configuration", async () => {
      handlers = new ConfigHandlers({} as McpConfig);
      const req = {} as Request;
      const res = createMockResponse();

      handlers.handleConfig(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid server configuration",
      });
    });
  });
});
