import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import {
  validateEnvironmentVariables,
  loadApiKey,
  loadServerConfig,
  loadUserConfig,
} from "../preflight.js";

// Mock external modules
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

// Mock directory entry implementation
const createMockDirent = (name: string) => ({
  name,
  isDirectory: () => true,
  isFile: () => false,
  isBlockDevice: () => false,
  isCharacterDevice: () => false,
  isSymbolicLink: () => false,
  isFIFO: () => false,
  isSocket: () => false,
  path: "",
  parentPath: "",
});

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
      await expect(validateEnvironmentVariables()).resolves.not.toThrow();
    });

    it("should throw error when SYSTEMPROMPT_API_KEY is missing", async () => {
      delete process.env.SYSTEMPROMPT_API_KEY;
      await expect(validateEnvironmentVariables()).rejects.toThrow(
        "Critical environment variables are missing"
      );
    });
  });

  describe("loadApiKey", () => {
    it("should return existing API key from env when .env file exists", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-key";
      vi.mocked(fs.readFile).mockResolvedValue("SYSTEMPROMPT_API_KEY=test-key");

      const apiKey = await loadApiKey();
      expect(apiKey).toBe("test-key");
    });

    it("should create .env file if it doesn't exist", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-key";
      vi.mocked(fs.readFile).mockRejectedValue({ code: "ENOENT" });
      vi.mocked(fs.writeFile).mockResolvedValue();

      const apiKey = await loadApiKey();
      expect(apiKey).toBe("test-key");
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining(".env"),
        "SYSTEMPROMPT_API_KEY=test-key\n"
      );
    });

    it("should throw error when API key is not in environment", async () => {
      delete process.env.SYSTEMPROMPT_API_KEY;

      await expect(loadApiKey()).rejects.toThrow(
        "SYSTEMPROMPT_API_KEY is not set"
      );
    });
  });

  describe("loadServerConfig", () => {
    it("should load and merge backend and custom servers", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
      process.env.NOTION_API_KEY = "test-notion-key";

      // Mock available extensions
      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent("systemprompt-mcp-notion"),
        createMockDirent("systemprompt-mcp-core"),
        createMockDirent("other-dir"),
      ]);

      // Mock backend response
      const mockBackendResponse = {
        data: {
          mcpServers: {
            "systemprompt-mcp-notion": {
              command: "node",
              args: ["extensions/systemprompt-mcp-notion/build/index.js"],
              env: ["NOTION_API_KEY"],
              metadata: {
                icon: "notion-icon",
                description: "Notion integration",
              },
            },
          },
          available: {
            "systemprompt-mcp-notion": {
              id: "notion",
              type: "core",
              title: "Notion",
              description: "Notion integration",
              environment_variables: ["NOTION_API_KEY"],
              icon: "notion-icon",
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBackendResponse),
      });

      // Mock custom config
      const mockCustomConfig = {
        mcpServers: {
          "custom-server": {
            command: "custom-cmd",
            args: ["--custom"],
            env: ["CUSTOM_KEY"],
          },
        },
      };

      // Mock config files
      const mockFileReads = new Map([
        ["mcp.config.custom.json", JSON.stringify(mockCustomConfig)],
        ["mcp.config.json", JSON.stringify({ mcpServers: {} })],
      ]);

      vi.mocked(fs.readFile).mockImplementation((path) => {
        const pathStr = path.toString();
        for (const [pattern, content] of mockFileReads.entries()) {
          if (pathStr.endsWith(pattern)) {
            return Promise.resolve(content);
          }
        }
        return Promise.reject(new Error(`No mock for path: ${path}`));
      });

      const result = await loadServerConfig();

      expect(result.mcpServers).toBeDefined();
      expect(Object.keys(result.mcpServers)).toContain("custom-server");
      expect(Object.keys(result.mcpServers)).toContain(
        "systemprompt-mcp-notion"
      );
    });

    it("should warn about missing extensions", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";

      // Mock only one available extension
      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent("systemprompt-mcp-notion"),
      ]);

      // Mock backend response
      const mockBackendResponse = {
        data: {
          mcpServers: {
            "systemprompt-mcp-notion": {
              command: "node",
              args: ["extensions/systemprompt-mcp-notion/build/index.js"],
              env: ["NOTION_API_KEY"],
            },
            "systemprompt-mcp-missing": {
              command: "node",
              args: ["extensions/systemprompt-mcp-missing/build/index.js"],
              env: ["OTHER_KEY"],
            },
          },
          available: {
            "systemprompt-mcp-notion": {
              id: "notion",
              type: "core",
              title: "Notion",
              environment_variables: ["NOTION_API_KEY"],
            },
            "systemprompt-mcp-missing": {
              id: "missing",
              type: "core",
              title: "Missing",
              environment_variables: ["OTHER_KEY"],
            },
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBackendResponse),
      });

      // Mock config files
      const mockFileReads = new Map([
        ["mcp.config.custom.json", "{}"],
        ["mcp.config.json", JSON.stringify({ mcpServers: {} })],
      ]);

      vi.mocked(fs.readFile).mockImplementation((path) => {
        const pathStr = path.toString();
        for (const [pattern, content] of mockFileReads.entries()) {
          if (pathStr.endsWith(pattern)) {
            return Promise.resolve(content);
          }
        }
        return Promise.reject(new Error(`No mock for path: ${path}`));
      });

      const result = await loadServerConfig();
      expect(result.mcpServers["systemprompt-mcp-notion"]).toBeDefined();
      expect(result.mcpServers["systemprompt-mcp-missing"]).toBeUndefined();
    });

    it("should handle backend API errors gracefully", async () => {
      process.env.SYSTEMPROMPT_API_KEY = "test-api-key";

      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent("systemprompt-mcp-notion"),
      ]);

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const mockCustomConfig = {
        mcpServers: {
          "custom-server": {
            command: "custom-cmd",
            args: ["--custom"],
            env: ["CUSTOM_KEY"],
          },
        },
      };

      // Mock config files
      const mockFileReads = new Map([
        ["mcp.config.custom.json", JSON.stringify(mockCustomConfig)],
        ["mcp.config.json", JSON.stringify({ mcpServers: {} })],
      ]);

      vi.mocked(fs.readFile).mockImplementation((path) => {
        const pathStr = path.toString();
        for (const [pattern, content] of mockFileReads.entries()) {
          if (pathStr.endsWith(pattern)) {
            return Promise.resolve(content);
          }
        }
        return Promise.reject(new Error(`No mock for path: ${path}`));
      });

      const result = await loadServerConfig();

      expect(result.mcpServers).toBeDefined();
      expect(Object.keys(result.mcpServers)).toContain("custom-server");
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
});
