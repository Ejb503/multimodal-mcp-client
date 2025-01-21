import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { findActualExecutable } from "spawn-rx";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs/promises";
import { input } from "@inquirer/prompts";

import {
  validateEnvironmentVariables,
  checkNpxAvailability,
  verifyMcpPackage,
  loadApiKey,
  loadServerConfig,
  loadUserConfig,
  updateServerPaths,
} from "../preflight.js";

// Mock external modules
vi.mock("spawn-rx");
vi.mock("@modelcontextprotocol/sdk/client/stdio.js");
vi.mock("fs/promises");
vi.mock("@inquirer/prompts");
vi.mock("chalk", () => ({
  default: {
    bold: { cyan: vi.fn((str) => str) },
    yellow: vi.fn((str) => str),
    red: vi.fn((str) => str),
    gray: vi.fn((str) => str),
    cyan: vi.fn((str) => str),
  },
}));
vi.mock("ora", () => ({
  default: vi.fn(() => ({
    start: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    warn: vi.fn().mockReturnThis(),
    info: vi.fn().mockReturnThis(),
  })),
}));

describe("preflight", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("validateEnvironmentVariables", () => {
    it("should succeed when all required env vars are present", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-key";
      process.env.SYSTEMPROMPT_NPX_PATH = "test-path";
      process.env.SYSTEMPROMPT_NPX_ARGS = "[]";

      await expect(validateEnvironmentVariables()).resolves.not.toThrow();
    });

    it("should throw error when SYSTEMPROMPT_API_KEY is missing", async () => {
      delete process.env.SYSTEMPROMPT_API_KEY;
      process.env.SYSTEMPROMPT_NPX_PATH = "test-path";
      process.env.SYSTEMPROMPT_NPX_ARGS = "[]";

      await expect(validateEnvironmentVariables()).rejects.toThrow(
        "Critical environment variables are missing"
      );
    });

    it("should warn but not throw when non-critical env vars are missing", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-key";
      delete process.env.SYSTEMPROMPT_NPX_PATH;
      delete process.env.SYSTEMPROMPT_NPX_ARGS;

      await expect(validateEnvironmentVariables()).resolves.not.toThrow();
    });
  });

  describe("checkNpxAvailability", () => {
    it("should verify npx and update env file", async () => {
      const mockExecInfo = {
        cmd: "npx",
        args: ["--version"],
      };

      vi.mocked(findActualExecutable).mockReturnValue(mockExecInfo);
      vi.mocked(fs.readFile).mockResolvedValue("");
      vi.mocked(fs.writeFile).mockResolvedValue();

      const result = await checkNpxAvailability();
      expect(result).toEqual(mockExecInfo);
      expect(process.env.SYSTEMPROMPT_NPX_PATH).toBe(mockExecInfo.cmd);
      expect(process.env.SYSTEMPROMPT_NPX_ARGS).toBe(
        JSON.stringify(mockExecInfo.args)
      );
    });

    it("should handle existing env file content", async () => {
      const mockExecInfo = {
        cmd: "npx",
        args: ["--version"],
      };

      vi.mocked(findActualExecutable).mockReturnValue(mockExecInfo);
      vi.mocked(fs.readFile).mockResolvedValue(
        "SYSTEMPROMPT_NPX_PATH=old-path\nSYSTEMPROMPT_NPX_ARGS=[]"
      );
      vi.mocked(fs.writeFile).mockResolvedValue();

      await checkNpxAvailability();
      expect(fs.writeFile).toHaveBeenCalledWith(
        ".env",
        expect.stringContaining("SYSTEMPROMPT_NPX_PATH=npx")
      );
    });

    it("should throw error when npx check fails", async () => {
      vi.mocked(findActualExecutable).mockImplementation(() => {
        throw new Error("npx not found");
      });

      await expect(checkNpxAvailability()).rejects.toThrow(
        "npx is not available"
      );
    });
  });

  describe("verifyMcpPackage", () => {
    const mockNpxInfo = {
      cmd: "npx",
      args: ["--version"],
    };

    it("should verify MCP package successfully", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-key";
      vi.mocked(StdioClientTransport.prototype.start).mockResolvedValue();
      vi.mocked(StdioClientTransport.prototype.close).mockResolvedValue();

      await expect(verifyMcpPackage(mockNpxInfo)).resolves.not.toThrow();
    });

    it("should load API key if not in env", async () => {
      delete process.env.SYSTEMPROMPT_API_KEY;
      vi.mocked(input).mockResolvedValue("test-key");
      vi.mocked(StdioClientTransport.prototype.start).mockResolvedValue();
      vi.mocked(StdioClientTransport.prototype.close).mockResolvedValue();

      await expect(verifyMcpPackage(mockNpxInfo)).resolves.not.toThrow();
    });

    it("should throw error when package verification fails", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-key";
      vi.mocked(StdioClientTransport.prototype.start).mockRejectedValue(
        new Error("Package not found")
      );

      await expect(verifyMcpPackage(mockNpxInfo)).rejects.toThrow(
        "Cannot access MCP server package"
      );
    });
  });

  describe("loadApiKey", () => {
    it("should return existing API key from env", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-key";
      const apiKey = await loadApiKey();
      expect(apiKey).toBe("test-key");
    });

    it("should prompt for API key if not in env", async () => {
      delete process.env.SYSTEMPROMPT_API_KEY;
      vi.mocked(input).mockResolvedValue("new-test-key");
      vi.mocked(fs.readFile).mockResolvedValue("");
      vi.mocked(fs.writeFile).mockResolvedValue();

      const apiKey = await loadApiKey();
      expect(apiKey).toBe("new-test-key");
      expect(fs.writeFile).toHaveBeenCalledWith(
        ".env",
        "SYSTEMPROMPT_API_KEY=new-test-key"
      );
    });

    it("should update existing API key in env file", async () => {
      delete process.env.SYSTEMPROMPT_API_KEY;
      vi.mocked(input).mockResolvedValue("new-test-key");
      vi.mocked(fs.readFile).mockResolvedValue("SYSTEMPROMPT_API_KEY=old-key");
      vi.mocked(fs.writeFile).mockResolvedValue();

      await loadApiKey();
      expect(fs.writeFile).toHaveBeenCalledWith(
        ".env",
        "SYSTEMPROMPT_API_KEY=new-test-key"
      );
    });
  });

  describe("loadServerConfig", () => {
    it("should load and merge custom server config with contrib servers", async () => {
      process.env.SYSTEMPROMPT_NPX_PATH = "test-npx";
      process.env.SYSTEMPROMPT_NPX_ARGS = JSON.stringify(["--test-arg"]);

      const mockContribConfig = {
        mcpServers: {
          "systemprompt-mcp-notion": {
            command: undefined,
            args: ["@systemprompt/mcp-notion"],
          },
          "contrib-server": {
            command: "contrib-cmd",
            args: ["--contrib"],
          },
        },
      };

      const mockCustomConfig = {
        mcpServers: {
          "custom-systemprompt-mcp-notion": {
            command: "node",
            args: [
              "C:\\Users\\ejb50\\Websites\\mcp-server-systemprompt-notion\\build\\index.js",
            ],
            env: ["NOTION_API_KEY", "SYSTEMPROMPT_API_KEY"],
            metadata: {
              icon: "solar:notebook-line-duotone",
              description: "Custom Systemprompt Notion MCP server",
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContribConfig),
      });

      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify(mockCustomConfig)
      );

      const result = await loadServerConfig("test-key");
      expect(result).toEqual({
        mcpServers: {
          "systemprompt-mcp-notion": {
            ...mockContribConfig.mcpServers["systemprompt-mcp-notion"],
            command: "test-npx",
            args: ["--test-arg", "systemprompt-mcp-notion"],
          },
          "contrib-server": mockContribConfig.mcpServers["contrib-server"],
          ...mockCustomConfig.mcpServers,
        },
      });
    });

    it("should load contrib servers even if custom config is missing", async () => {
      process.env.SYSTEMPROMPT_NPX_PATH = "test-npx";
      process.env.SYSTEMPROMPT_NPX_ARGS = JSON.stringify(["--test-arg"]);

      const mockContribConfig = {
        mcpServers: {
          "systemprompt-mcp-notion": {
            command: undefined,
            args: ["@systemprompt/mcp-notion"],
          },
          "contrib-server": {
            command: "contrib-cmd",
            args: ["--contrib"],
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContribConfig),
      });

      vi.mocked(fs.readFile).mockRejectedValue(new Error("File not found"));

      const result = await loadServerConfig("test-key");
      expect(result).toEqual({
        mcpServers: {
          "systemprompt-mcp-notion": {
            ...mockContribConfig.mcpServers["systemprompt-mcp-notion"],
            command: "test-npx",
            args: ["--test-arg", "systemprompt-mcp-notion"],
          },
          "contrib-server": mockContribConfig.mcpServers["contrib-server"],
        },
      });
    });

    it("should load server config successfully", async () => {
      process.env.SYSTEMPROMPT_NPX_PATH = "test-npx";
      process.env.SYSTEMPROMPT_NPX_ARGS = JSON.stringify(["--test-arg"]);

      const mockConfig = {
        mcpServers: {
          "systemprompt-mcp-notion": {
            command: undefined,
            args: ["@systemprompt/mcp-notion"],
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      });

      const result = await loadServerConfig("test-key");
      expect(result).toEqual({
        mcpServers: {
          "systemprompt-mcp-notion": {
            ...mockConfig.mcpServers["systemprompt-mcp-notion"],
            command: "test-npx",
            args: ["--test-arg", "systemprompt-mcp-notion"],
          },
        },
      });
    });

    it("should handle missing config file", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      await expect(loadServerConfig("test-key")).rejects.toThrow(
        "Failed to load config: Not Found"
      );
    });

    it("should handle invalid JSON", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      await expect(loadServerConfig("test-key")).rejects.toThrow();
    });

    it("should throw error when contrib server has undefined command and no npx path", async () => {
      delete process.env.SYSTEMPROMPT_NPX_PATH;
      process.env.SYSTEMPROMPT_NPX_ARGS = JSON.stringify(["--test-arg"]);

      const mockContribConfig = {
        mcpServers: {
          "systemprompt-mcp-notion": {
            command: undefined,
            args: [],
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockContribConfig),
      });

      await expect(loadServerConfig("test-key")).rejects.toThrow(
        "SYSTEMPROMPT_NPX_PATH is not set"
      );
    });
  });

  describe("loadUserConfig", () => {
    it("should load user config successfully", async () => {
      const mockConfig = {
        mcpServers: {
          test: {
            command: "test-cmd",
            args: ["--test"],
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockConfig),
      });

      const result = await loadUserConfig("test-key");
      expect(result).toEqual(mockConfig);
    });

    it("should handle missing config file", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      await expect(loadUserConfig("test-key")).rejects.toThrow(
        "Failed to load config: Not Found"
      );
    });

    it("should handle invalid JSON", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      await expect(loadUserConfig("test-key")).rejects.toThrow();
    });
  });

  describe("updateServerPaths", () => {
    const mockNpxInfo = {
      cmd: "npx",
      args: ["--version"],
    };

    beforeEach(() => {
      process.env.SYSTEMPROMPT_API_KEY = "test-key";
    });

    it("should update server paths in config", async () => {
      const mockConfig = {
        mcpServers: {
          test: {
            command: "npx",
            args: ["--test"],
          },
        },
      };

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockConfig),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });

      await updateServerPaths(mockNpxInfo);
      expect(global.fetch).toHaveBeenCalledWith(
        "http://127.0.0.1/v1/mcp",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining(mockNpxInfo.cmd),
        })
      );
    });

    it("should handle missing config", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      await expect(updateServerPaths(mockNpxInfo)).rejects.toThrow(
        "Failed to load config: Not Found"
      );
    });

    it("should handle invalid JSON", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      await expect(updateServerPaths(mockNpxInfo)).rejects.toThrow();
    });
  });
});
