import { describe, it, beforeEach, vi } from "vitest";
import { parseArgs } from "node:util";

vi.mock("node:util", () => ({
  parseArgs: vi.fn((config) => ({
    values: { port: config?.options?.port?.default || "3000" },
    positionals: [],
  })),
}));

describe("main function", () => {
  beforeEach(() => {
    vi.resetModules();
    process.argv = ["node", "index.js"];
    vi.clearAllMocks();
  });

  it("should start the server with default port", async () => {
    // ... existing code ...
  });

  it("should start the server with custom port", async () => {
    process.argv = ["node", "index.js", "--port", "4000"];
    vi.mocked(parseArgs).mockImplementationOnce((config) => ({
      values: { port: "4000" },
      positionals: [],
    }));
    // ... existing code ...
  });
  // ... existing code ...
});
