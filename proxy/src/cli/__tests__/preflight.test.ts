import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import { input } from "@inquirer/prompts";

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
      const mockBackendServers = {
        "systemprompt-mcp-notion": {
          env: ["NOTION_API_KEY"],
          metadata: {
            icon: "notion-icon",
            description: "Notion integration",
          },
        },
        "systemprompt-mcp-core": {
          env: ["SYSTEMPROMPT_API_KEY"],
          metadata: {
            icon: "core-icon",
            description: "Core functionality",
          },
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ mcpServers: mockBackendServers }),
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

      vi.mocked(fs.readFile).mockResolvedValue(
        JSON.stringify(mockCustomConfig)
      );

      const result = await loadServerConfig();

      expect(result.mcpServers).toBeDefined();
      expect(Object.keys(result.mcpServers)).toContain(
        "systemprompt-mcp-notion"
      );
      expect(Object.keys(result.mcpServers)).toContain("systemprompt-mcp-core");
      expect(Object.keys(result.mcpServers)).toContain("custom-server");
    });

    it("should warn about missing extensions", async () => {
      // Mock only one available extension
      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent("systemprompt-mcp-notion"),
      ]);

      // Mock backend response with servers that need missing extensions
      const mockBackendServers = {
        "systemprompt-mcp-notion": {
          env: ["NOTION_API_KEY"],
        },
        "systemprompt-mcp-missing": {
          env: ["OTHER_KEY"],
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ mcpServers: mockBackendServers }),
      });

      vi.mocked(fs.readFile).mockResolvedValue("{}");

      const result = await loadServerConfig();

      expect(result.mcpServers["systemprompt-mcp-notion"]).toBeDefined();
      expect(result.mcpServers["systemprompt-mcp-missing"]).toBeUndefined();
    });

    it("should handle backend API errors gracefully", async () => {
      vi.mocked(fs.readdir).mockResolvedValue([
        createMockDirent("systemprompt-mcp-notion"),
      ]);

      // Mock backend API error
      global.fetch = vi.fn().mockRejectedValue(new Error("API Error"));

      vi.mocked(fs.readFile).mockResolvedValue("{}");

      const result = await loadServerConfig();

      // Should still load custom config even if backend fails
      expect(result.mcpServers).toBeDefined();
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
