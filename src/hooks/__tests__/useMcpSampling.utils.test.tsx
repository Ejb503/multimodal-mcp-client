import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { SamplingProgressManager } from "../useMcpSampling.utils";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

describe("SamplingProgressManager", () => {
  const mockClient = {
    notification: vi.fn().mockResolvedValue(undefined) as Mock,
  } as unknown as Client;

  const progressToken = "test-token";
  let manager: SamplingProgressManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new SamplingProgressManager(mockClient, progressToken);
  });

  it("should send start progress notification", async () => {
    await manager.start();

    expect(mockClient.notification).toHaveBeenCalledWith({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: 0,
        total: 100,
        status: "Starting sampling process...",
      },
    });
  });

  it("should send update progress notification", async () => {
    await manager.update(50);

    expect(mockClient.notification).toHaveBeenCalledWith({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: 50,
        total: 100,
        status: "Processing...",
      },
    });
  });

  it("should send complete progress notification", async () => {
    await manager.complete();

    expect(mockClient.notification).toHaveBeenCalledWith({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: 100,
        total: 100,
        status: "Sampling complete",
      },
    });
  });

  it("should send reject progress notification", async () => {
    await manager.reject();

    expect(mockClient.notification).toHaveBeenCalledWith({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: 0,
        total: 100,
        status: "Sampling rejected",
      },
    });
  });

  it("should send error progress notification", async () => {
    const errorMessage = "Test error message";
    await manager.error(errorMessage);

    expect(mockClient.notification).toHaveBeenCalledWith({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: 0,
        total: 100,
        status: `Error: ${errorMessage}`,
      },
    });
  });

  it("should send progress with custom total", async () => {
    await manager.sendProgress({
      progress: 5,
      total: 10,
      status: "Custom progress",
    });

    expect(mockClient.notification).toHaveBeenCalledWith({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: 5,
        total: 10,
        status: "Custom progress",
      },
    });
  });

  it("should send progress without status", async () => {
    await manager.sendProgress({
      progress: 50,
    });

    expect(mockClient.notification).toHaveBeenCalledWith({
      method: "notifications/progress",
      params: {
        progressToken,
        progress: 50,
        total: 100,
      },
    });
  });

  it("should handle notification errors", async () => {
    const error = new Error("Test error");
    mockClient.notification.mockRejectedValueOnce(error);

    await expect(manager.start()).rejects.toThrow(error);
  });
});
