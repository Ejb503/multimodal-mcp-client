import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { ProgressToken } from "@modelcontextprotocol/sdk/types.js";

export class SamplingProgressManager {
  constructor(private client: Client, private progressToken: ProgressToken) {}

  async sendProgress(params: {
    progress: number;
    total?: number;
    status?: string;
  }): Promise<void> {
    await this.client.notification({
      method: "notifications/progress",
      params: {
        progressToken: this.progressToken,
        progress: params.progress,
        total: params.total ?? 100,
        ...(params.status && { status: params.status }),
      },
    });
  }

  async start(): Promise<void> {
    await this.sendProgress({
      progress: 0,
      status: "Starting sampling process...",
    });
  }

  async update(progress: number): Promise<void> {
    await this.sendProgress({
      progress,
      status: "Processing...",
    });
  }

  async complete(): Promise<void> {
    await this.sendProgress({
      progress: 100,
      status: "Sampling complete",
    });
  }

  async reject(): Promise<void> {
    await this.sendProgress({
      progress: 0,
      status: "Sampling rejected",
    });
  }

  async error(message: string): Promise<void> {
    await this.sendProgress({
      progress: 0,
      status: `Error: ${message}`,
    });
  }
}
