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
    it("should return remote configuration when API call succeeds", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      const mockResponse = {
        ok: true,
        json: vi.fn().mockResolvedValue(mockConfig),
      };
      global.fetch = vi.fn().mockResolvedValue(mockResponse);

      const req = {} as Request;
      const res = createMockResponse();

      await handlers.handleConfig(req, res as unknown as Response);

      expect(res.json).toHaveBeenCalledWith({
        mcpServers: mockConfig.mcpServers,
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle missing API key", async () => {
      delete process.env.SYSTEMPROMPT_API_KEY;

      const req = {} as Request;
      const res = createMockResponse();

      await handlers.handleConfig(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        mcpServers: mockConfig.mcpServers,
      });
    });
  });
});
