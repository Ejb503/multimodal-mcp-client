import { beforeAll, afterAll, afterEach, vi } from "vitest";
import { Express } from "express";
import supertest from "supertest";
import type { McpConfig } from "../../types/index.js";
import { ProxyServer } from "../../server.js";

export const createTestServer = (
  config: Partial<McpConfig> = {}
): {
  app: Express;
  server: ProxyServer;
} => {
  const server = new ProxyServer(config as McpConfig);
  return {
    app: server.getExpressApp(),
    server,
  };
};

export const createTestClient = (app: Express) => {
  return supertest(app);
};

// Mock console methods to keep test output clean
beforeAll(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

// Clear all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Restore console methods after all tests
afterAll(() => {
  vi.restoreAllMocks();
});
