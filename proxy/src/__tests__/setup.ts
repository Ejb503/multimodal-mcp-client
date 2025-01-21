import { vi } from "vitest";
import type { ProxyServer } from "../server.js";

// Mock console methods to keep test output clean
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});

// Configure vitest for our tests
vi.mock("@modelcontextprotocol/sdk/client/stdio.js");
vi.mock("@modelcontextprotocol/sdk/server/sse.js");
vi.mock("spawn-rx");
vi.mock("axios");

// Allow accessing private methods in tests
vi.mock("../server.js", async (importOriginal) => {
  const mod = (await importOriginal()) as { ProxyServer: typeof ProxyServer };
  const originalProxyServer = mod.ProxyServer;
  return {
    ...mod,
    ProxyServer: function (...args: ConstructorParameters<typeof ProxyServer>) {
      const instance = new originalProxyServer(...args);
      return Object.assign(instance, {
        handleSSE: instance["handleSSE"].bind(instance),
      });
    } as unknown as typeof ProxyServer,
  };
});
