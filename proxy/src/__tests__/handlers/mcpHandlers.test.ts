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
import axios, { AxiosError } from "axios";

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
        data: mockConfig,
        status: 200,
      };
      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const req = {} as Request;
      const res = createMockResponse();

      await handlers.handleGetMcp(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockConfig);
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
      const error = new AxiosError("timeout of 5000ms exceeded");
      error.code = "ECONNABORTED";
      mockedAxios.get.mockRejectedValueOnce(error);

      const req = {} as Request;
      const res = createMockResponse();

      await handlers.handleGetMcp(req, res as unknown as Response);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(mockConfig);
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
      const error = new AxiosError("timeout of 5000ms exceeded");
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
  });
});
