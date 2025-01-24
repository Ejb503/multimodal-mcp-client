import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ProxyServer } from "../server.js";
import type { Express } from "express";
import { TransportManager } from "../transports/index.js";
import { ConfigHandlers } from "../handlers/configHandlers.js";
import { McpHandlers } from "../handlers/mcpHandlers.js";
import { parseArgs } from "node:util";

// Mock ProxyServer
vi.mock("../server.js", () => ({
  ProxyServer: {
    create: vi.fn(),
  },
}));

// Mock node:util for argument parsing
vi.mock("node:util", () => ({
  parseArgs: vi.fn(),
}));

// Mock console.log and console.error
const mockConsoleLog = vi.spyOn(console, "log").mockImplementation(() => {});
const mockConsoleError = vi
  .spyOn(console, "error")
  .mockImplementation(() => {});

// Mock process.exit
const mockExit = vi
  .spyOn(process, "exit")
  .mockImplementation(() => undefined as never);

describe("index.ts", () => {
  const mockStartServer = vi.fn<[number], Promise<void>>();
  const mockServer = {
    app: {} as Express,
    transportManager: {} as TransportManager,
    configHandlers: {} as ConfigHandlers,
    mcpHandlers: {} as McpHandlers,
    server: null,
    isShuttingDown: false,
    startServer: mockStartServer,
    setupMiddleware: vi.fn(),
    setupRoutes: vi.fn(),
    handleShutdown: vi.fn(),
  } as unknown as ProxyServer;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.argv = ["node", "index.js"];
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("main function", () => {
    it("should start server with default port", async () => {
      vi.mocked(parseArgs).mockReturnValue({
        values: { port: "3000" },
        positionals: [],
      });
      vi.mocked(ProxyServer.create).mockResolvedValueOnce(mockServer);
      mockStartServer.mockResolvedValueOnce(undefined);

      const { main } = await import("../index.js");
      await main();

      expect(ProxyServer.create).toHaveBeenCalled();
      expect(mockStartServer).toHaveBeenCalledWith(3000);
    });

    it("should start server with custom port", async () => {
      process.argv = ["node", "index.js", "--port", "4000"];
      vi.mocked(parseArgs).mockReturnValue({
        values: { port: "4000" },
        positionals: [],
      });
      vi.mocked(ProxyServer.create).mockResolvedValueOnce(mockServer);
      mockStartServer.mockResolvedValueOnce(undefined);

      const { main } = await import("../index.js");
      await main();

      expect(ProxyServer.create).toHaveBeenCalled();
      expect(mockStartServer).toHaveBeenCalledWith(4000);
    });

    it("should handle server creation error", async () => {
      vi.mocked(parseArgs).mockReturnValue({
        values: { port: "3000" },
        positionals: [],
      });
      const error = new Error("Failed to create server");
      vi.mocked(ProxyServer.create).mockRejectedValueOnce(error);

      const { main } = await import("../index.js");
      await main();

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Failed to start server")
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining(error.message)
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("should handle server start error", async () => {
      vi.mocked(parseArgs).mockReturnValue({
        values: { port: "3000" },
        positionals: [],
      });
      const error = new Error("Failed to start server");
      vi.mocked(ProxyServer.create).mockResolvedValueOnce(mockServer);
      mockStartServer.mockRejectedValueOnce(error);

      const { main } = await import("../index.js");
      await main();

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining("Failed to start server")
      );
      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining(error.message)
      );
      expect(mockExit).toHaveBeenCalledWith(1);
    });
  });

  describe("banner", () => {
    it("should print banner with version", async () => {
      vi.mocked(parseArgs).mockReturnValue({
        values: { port: "3000" },
        positionals: [],
      });
      vi.mocked(ProxyServer.create).mockResolvedValueOnce(mockServer);
      mockStartServer.mockResolvedValueOnce(undefined);

      const { main } = await import("../index.js");
      await main();

      const bannerCalls = mockConsoleLog.mock.calls;
      expect(bannerCalls[1][0]).toContain("Systemprompt MCP Server");
      expect(bannerCalls[1][0]).toContain("v0.3.13");
    });

    it("should format banner with correct borders", async () => {
      vi.mocked(parseArgs).mockReturnValue({
        values: { port: "3000" },
        positionals: [],
      });
      vi.mocked(ProxyServer.create).mockResolvedValueOnce(mockServer);
      mockStartServer.mockResolvedValueOnce(undefined);

      const { main } = await import("../index.js");
      await main();

      const bannerCalls = mockConsoleLog.mock.calls;
      expect(bannerCalls[0][0]).toContain("┌");
      expect(bannerCalls[0][0]).toContain("─".repeat(60));
      expect(bannerCalls[0][0]).toContain("┐");
      expect(bannerCalls[1][0]).toContain("│");
      expect(bannerCalls[2][0]).toContain("└");
      expect(bannerCalls[2][0]).toContain("─".repeat(60));
      expect(bannerCalls[2][0]).toContain("┘");
    });
  });
});
