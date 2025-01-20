import type { ServerConfig, TransformedMcpData } from "../types/index.js";

export class McpApiService {
  private readonly _baseUrl: string;
  private readonly apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this._baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  // Getter for testing
  get baseUrl(): string {
    return this._baseUrl;
  }

  async fetchMcpData(): Promise<TransformedMcpData> {
    const response = await this.fetchFromApi<TransformedMcpData>("/v1/mcp");
    return response;
  }

  async updateMcpConfig(
    config: TransformedMcpData
  ): Promise<TransformedMcpData> {
    const response = await this.postToApi<TransformedMcpData>(
      "/v1/mcp",
      config
    );
    return response;
  }

  async transformServers(
    servers: Record<string, ServerConfig>
  ): Promise<Record<string, ServerConfig>> {
    const transformedServers: Record<string, ServerConfig> = {};

    for (const id of Object.keys(servers)) {
      transformedServers[id] = {
        command: "C:\\Program Files\\nodejs\\npx.cmd",
        args: ["-y", id],
        env: { SYSTEMPROMPT_API_KEY: process.env.SYSTEMPROMPT_API_KEY || "" },
        metadata: {
          icon: "solar:programming-line-duotone",
          color: "secondary",
          description: `${id} MCP server`,
          serverType: "core",
        },
      };
    }

    return transformedServers;
  }

  async fetchFromApi<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = new URL(endpoint, this._baseUrl);
    console.log("Fetching from:", url.toString());
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "Content-Type": "application/json",
        "api-key": this.apiKey,
      },
    });

    if (!response.ok) {
      console.error("API request failed:", {
        status: response.status,
        statusText: response.statusText,
        url: url.toString(),
      });
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }

  private async postToApi<T>(endpoint: string, data: unknown): Promise<T> {
    const url = new URL(endpoint, this._baseUrl).toString();
    console.log("Posting to:", url);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": this.apiKey,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      console.error("API request failed:", {
        status: response.status,
        statusText: response.statusText,
        url,
      });
      throw new Error(
        `Error POSTing to endpoint (HTTP ${response.status}): ${await response.text()}`
      );
    }

    return response.json();
  }
}
