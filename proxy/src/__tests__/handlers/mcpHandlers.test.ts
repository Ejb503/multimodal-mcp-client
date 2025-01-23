import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mocked,
} from "vitest";
import { McpHandlers } from "../../handlers/mcpHandlers.js";
import type { Request, Response } from "express";
import type { McpConfig } from "../../types/index.js";
import axios from "axios";

vi.mock("axios");
const mockedAxios = axios as Mocked<typeof axios>;

describe("McpHandlers", () => {
  let handlers: McpHandlers;
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
    available: {},
    agents: [],
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
    handlers = new McpHandlers(mockConfig);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("handleGetMcp", () => {
    it("should return remote MCP configuration when API call succeeds", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      const mockResponse = {
        data: {
          installed: [],
          available: {
            "systemprompt-mcp-test": {
              id: "test-id",
              type: "core",
              title: "Test Module",
              description: "Test Description",
              environment_variables: ["TEST_VAR"],
              github_link: "https://github.com/test",
              icon: "test-icon",
              npm_link: "https://npm.test",
              metadata: {
                created: "2024-01-01",
                updated: "2024-01-01",
                version: 1,
                status: "active",
              },
              block: null,
              prompt: null,
              agent: [],
              _link: "test-link",
            },
          },
        },
      };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const req = {} as Request;
      const res = createMockResponse();

      await handlers.handleGetMcp(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        mcpServers: {
          "systemprompt-mcp-test": {
            command: "node",
            args: [
              expect.stringContaining(
                "extensions/systemprompt-mcp-test/build/index.js"
              ),
            ],
            env: { TEST_VAR: "" },
            metadata: {
              icon: "test-icon",
              description: "Test Description",
              title: "Test Module",
              type: "core",
            },
            agent: [],
          },
          default: {
            command: "test-command",
            args: ["--test"],
          },
        },
        defaults: mockConfig.defaults,
        available: mockResponse.data.available,
      });
    });

    it("should handle missing API key", async () => {
      delete process.env.SYSTEMPROMPT_API_KEY;

      const req = {} as Request;
      const res = createMockResponse();

      try {
        await handlers.handleGetMcp(req, res as unknown as Response);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("API key not configured");
      }
    });

    it("should handle timeout errors", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      const error = new Error("timeout of 5000ms exceeded") as Error & {
        code?: string;
      };
      error.code = "ECONNABORTED";
      mockedAxios.get.mockRejectedValueOnce(error);

      const req = {} as Request;
      const res = createMockResponse();

      await handlers.handleGetMcp(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockConfig);
    });

    it("should return local config when remote server returns unauthorized", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      const mockResponse = {
        status: 401,
        data: { error: "Unauthorized" },
      };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const req = {} as Request;
      const res = createMockResponse();

      await handlers.handleGetMcp(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockConfig);
    });

    it("should merge environment-based command and args for contrib servers", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      process.env.SYSTEMPROMPT_NPX_PATH = "test-npx";
      process.env.SYSTEMPROMPT_NPX_ARGS = JSON.stringify(["/C", "npx.cmd"]);

      const mockResponse = {
        data: {
          installed: [],
          available: {
            "systemprompt-mcp-notion": {
              id: "notion",
              type: "contrib",
              title: "Notion",
              description: "Notion integration",
              environment_variables: ["NOTION_API_KEY"],
              github_link: "https://github.com/test",
              icon: "notion-icon",
              npm_link: "https://npm.test",
              metadata: {
                created: "2024-01-01",
                updated: "2024-01-01",
                version: 1,
                status: "active",
              },
              block: null,
              prompt: null,
              agent: [],
              _link: "test-link",
            },
          },
        },
      };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const req = {} as Request;
      const res = createMockResponse();

      await handlers.handleGetMcp(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        mcpServers: {
          "systemprompt-mcp-notion": {
            command: "test-npx",
            args: ["/C", "npx.cmd", "systemprompt-mcp-notion"],
            env: { NOTION_API_KEY: "" },
            metadata: {
              icon: "notion-icon",
              description: "Notion integration",
              title: "Notion",
              type: "contrib",
            },
            agent: [],
          },
          default: {
            command: "test-command",
            args: ["--test"],
          },
        },
        defaults: mockConfig.defaults,
        available: mockResponse.data.available,
      });
    });

    it("should throw error if SYSTEMPROMPT_NPX_PATH is not set for contrib servers", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      delete process.env.SYSTEMPROMPT_NPX_PATH;

      const mockResponse = {
        data: {
          installed: [],
          available: {
            "systemprompt-mcp-notion": {
              id: "notion",
              type: "contrib",
              title: "Notion",
              description: "Notion integration",
              environment_variables: ["NOTION_API_KEY"],
              github_link: "https://github.com/test",
              icon: "notion-icon",
              npm_link: "https://npm.test",
              metadata: {
                created: "2024-01-01",
                updated: "2024-01-01",
                version: 1,
                status: "active",
              },
              block: null,
              prompt: null,
              agent: [],
              _link: "test-link",
            },
          },
        },
        status: 200,
      };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const req = {} as Request;
      const res = createMockResponse();

      await expect(
        handlers.handleGetMcp(req, res as unknown as Response)
      ).rejects.toThrow("SYSTEMPROMPT_NPX_PATH is not set");
    });
  });

  describe("handleGetUserMcp", () => {
    it("should return remote MCP configuration when API call succeeds", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      const mockResponse = {
        data: {
          user: {
            name: "Test User",
            email: "test@example.com",
            roles: ["user"],
          },
        },
        status: 200,
      };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const req = {} as Request;
      const res = createMockResponse();

      await handlers.handleGetUserMcp(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResponse.data);
    });

    it("should return default user configuration when unauthorized", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      const mockResponse = {
        status: 401,
        data: { error: "Unauthorized" },
      };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const req = {} as Request;
      const res = createMockResponse();

      await handlers.handleGetUserMcp(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        user: {
          name: "Default User",
          email: "user@example.com",
          roles: ["user"],
        },
        api_key: "test-api-key",
      });
    });

    it("should handle missing API key", async () => {
      delete process.env.SYSTEMPROMPT_API_KEY;

      const req = {} as Request;
      const res = createMockResponse();

      try {
        await handlers.handleGetUserMcp(req, res as unknown as Response);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("API key not configured");
      }
    });

    it("should handle timeout errors", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      const error = new Error("timeout of 5000ms exceeded") as Error & {
        code?: string;
      };
      error.code = "ECONNABORTED";
      mockedAxios.get.mockRejectedValueOnce(error);

      const req = {} as Request;
      const res = createMockResponse();

      await handlers.handleGetUserMcp(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        user: {
          name: "Default User",
          email: "user@example.com",
          roles: ["user"],
        },
        api_key: "test-api-key",
      });
    });
  });

  describe("handlePostConfigMcp", () => {
    it("should update configuration when API call succeeds", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      const mockResponse = {
        data: { status: "success" },
        status: 200,
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const req = {
        body: mockConfig,
      } as Request;
      const res = createMockResponse();

      await handlers.handlePostConfigMcp(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockResponse.data);
    });

    it("should handle unauthorized response", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      const mockReq = {
        body: {
          mcpServers: {
            test: {
              command: "test",
              args: ["--test"],
            },
          },
          available: {},
          defaults: mockConfig.defaults,
        },
      } as Request;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      vi.mocked(mockedAxios.post).mockResolvedValueOnce({
        status: 401,
        data: { error: "Unauthorized" },
      });

      await handlers.handlePostConfigMcp(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "Configuration updated locally",
          _warning: "Remote update failed - unauthorized",
        })
      );
    });

    it("should handle missing API key", async () => {
      delete process.env.SYSTEMPROMPT_API_KEY;

      const req = {
        body: mockConfig,
      } as Request;
      const res = createMockResponse();

      try {
        await handlers.handlePostConfigMcp(req, res as unknown as Response);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe("API key not configured");
      }
    });

    it("should handle timeout errors", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      const mockReq = {
        body: {
          mcpServers: {
            test: {
              command: "test",
              args: ["--test"],
            },
          },
          available: {},
          defaults: mockConfig.defaults,
        },
      } as Request;
      const mockRes = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      } as unknown as Response;

      const timeoutError = new Error("timeout of 5000ms exceeded") as Error & {
        code: string;
      };
      timeoutError.code = "ECONNABORTED";
      vi.mocked(mockedAxios.post).mockRejectedValueOnce(timeoutError);

      await handlers.handlePostConfigMcp(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "Configuration updated locally",
          _warning: "Remote update failed - timeout of 5000ms exceeded",
        })
      );
    });

    it("should merge custom servers with existing config", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      const mockResponse = {
        data: { status: "success" },
        status: 200,
      };
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const customConfig = {
        mcpServers: {
          custom: {
            command: "custom-command",
            args: ["--custom"],
          },
        },
        available: {},
        defaults: mockConfig.defaults,
      };

      const req = {
        body: customConfig,
      } as Request;
      const res = createMockResponse();

      await handlers.handlePostConfigMcp(req, res as unknown as Response);

      // Verify local config was updated
      const getReq = {} as Request;
      const getRes = createMockResponse();
      await handlers.handleGetMcp(getReq, getRes as unknown as Response);

      expect(getRes.status).toHaveBeenCalledWith(200);
      expect(getRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          mcpServers: expect.objectContaining({
            default: mockConfig.mcpServers.default,
            custom: customConfig.mcpServers.custom,
          }),
          available: {},
          defaults: mockConfig.defaults,
        })
      );
    });

    it("should update local config even when remote update fails", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      const error = new Error("Network error");
      mockedAxios.post.mockRejectedValueOnce(error);

      const newConfig = {
        mcpServers: {
          new: {
            command: "new-command",
            args: ["--new"],
          },
        },
        available: {},
        defaults: mockConfig.defaults,
      };

      const req = {
        body: newConfig,
      } as Request;
      const res = createMockResponse();

      await handlers.handlePostConfigMcp(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: "Configuration updated locally",
        _warning: "Remote update failed - Network error",
        mcpServers: {
          ...mockConfig.mcpServers,
          ...newConfig.mcpServers,
        },
        available: {},
        defaults: mockConfig.defaults,
      });
    });
  });
});
