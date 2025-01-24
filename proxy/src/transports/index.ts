import { Request } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { McpConfig } from "../types/index.js";

export type TransportType = "stdio" | "sse";
export type Transport = StdioClientTransport | SSEClientTransport;

export interface TransportParams {
  transportType: TransportType;
  serverId: string;
}

/**
 * Maps array-style environment variables to their actual values
 * @param envConfig The environment configuration object
 * @param baseEnv Base environment to extend from (optional)
 * @returns Mapped environment variables with API[name] and API key
 */
export function mapEnvironmentVariables(
  envConfig: Record<string, unknown> | string[] = {},
  baseEnv: Record<string, string> = process.env as Record<string, string>
): Record<string, string> {
  const env: Record<string, string> = { ...baseEnv };

  if (Array.isArray(envConfig)) {
    envConfig.forEach((key) => {
      if (typeof key === "string" && baseEnv[key]) {
        env[key] = baseEnv[key];
      }
    });
    return env;
  }
  Object.entries(envConfig).forEach(([key, value]) => {
    if (!isNaN(Number(key)) && typeof value === "string" && baseEnv[value]) {
      env[value] = baseEnv[value];
    } else if (typeof value === "string") {
      env[key] = value;
    }
  });

  return env;
}

export class TransportManager {
  private webAppTransports: SSEServerTransport[] = [];
  private config: McpConfig;
  private activeTransports: Map<string, Transport> = new Map();

  constructor(config: McpConfig) {
    this.config = config;
  }

  public updateConfig(newConfig: McpConfig): void {
    this.config = newConfig;
  }

  public validateTransportParams(query: Request["query"]): TransportParams {
    const serverId =
      typeof query.serverId === "string" ? query.serverId : "default";
    const transportType = query.transportType;

    if (transportType !== "stdio" && transportType !== "sse") {
      throw new Error("Invalid transport type specified");
    }

    return { transportType, serverId };
  }

  public async createTransport(query: Request["query"]): Promise<Transport> {
    const { transportType, serverId } = this.validateTransportParams(query);

    let transport: Transport;
    if (transportType === "stdio") {
      transport = await this.createStdioTransport(serverId);
    } else {
      transport = await this.createSSETransport(serverId);
    }

    // Store the transport in the activeTransports map
    this.activeTransports.set(serverId, transport);
    return transport;
  }

  private async createStdioTransport(
    serverId: string
  ): Promise<StdioClientTransport> {
    let serverConfig = Object.values(this.config.mcpServers).find(
      (server) => server.id === serverId
    );
    if (!serverConfig) {
      serverConfig = this.config.mcpServers[serverId];
    }

    if (!serverConfig) {
      throw new Error(`No configuration found for server: ${serverId}`);
    }

    if (!serverConfig.command || serverConfig.command.trim() === "") {
      throw new Error("Server command is required for stdio transport");
    }

    // Map environment variables
    const env = mapEnvironmentVariables(serverConfig.env);
    const transport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args || [],
      env,
      stderr: "pipe",
    });

    try {
      await transport.start();
      return transport;
    } catch (error) {
      console.error(
        `Failed to start stdio transport for server ${serverId}:`,
        error
      );
      throw error;
    }
  }

  private async createSSETransport(
    serverId: string
  ): Promise<SSEClientTransport> {
    const serverConfig = this.config.mcpServers[serverId];
    if (!serverConfig) {
      throw new Error(`No configuration found for server: ${serverId}`);
    }

    if (!process.env.SYSTEMPROMPT_API_KEY) {
      throw new Error("API key not configured");
    }

    const url = new URL("https://api.systemprompt.io/v1/mcp/sse");
    url.searchParams.set("apiKey", process.env.SYSTEMPROMPT_API_KEY);

    const transport = new SSEClientTransport(url);
    try {
      await transport.start();
      return transport;
    } catch (error) {
      console.error(
        `Failed to start SSE transport for server ${serverId}:`,
        error
      );
      throw error;
    }
  }

  public setupStderrHandler(
    backingServerTransport: StdioClientTransport,
    webAppTransport: SSEServerTransport,
    isConnected: boolean
  ): void {
    if (!backingServerTransport.stderr) {
      console.warn("No stderr available for stdio transport");
      return;
    }

    backingServerTransport.stderr.on("data", (chunk) => {
      try {
        if (isConnected) {
          webAppTransport.send({
            jsonrpc: "2.0",
            method: "notifications/stderr",
            params: {
              content: chunk.toString(),
            },
          });
        }
      } catch (error) {
        console.error("Error sending stderr data:", error);
      }
    });
  }

  public createErrorHandler(
    webAppTransport: SSEServerTransport,
    isConnected: boolean
  ) {
    return (error: Error) => {
      console.error("MCP proxy error:", error);
      try {
        if (isConnected) {
          webAppTransport.send({
            jsonrpc: "2.0",
            method: "notifications/error",
            params: {
              error: error.message || "Unknown error occurred",
            },
          });
        }
      } catch (sendError) {
        console.error("Error sending error notification:", sendError);
      }
    };
  }

  public addWebAppTransport(transport: SSEServerTransport): void {
    this.webAppTransports.push(transport);
  }

  public removeWebAppTransport(transport: SSEServerTransport): void {
    const index = this.webAppTransports.indexOf(transport);
    if (index > -1) {
      this.webAppTransports.splice(index, 1);
    }
  }

  public findWebAppTransport(
    sessionId: string
  ): SSEServerTransport | undefined {
    return this.webAppTransports.find((t) => t.sessionId === sessionId);
  }

  public async cleanup(): Promise<void> {
    await Promise.all(
      this.webAppTransports.map(async (transport) => {
        try {
          await transport.close?.();
        } catch (error) {
          console.error("Error closing transport:", error);
        }
      })
    );
    this.webAppTransports = [];
  }

  public async refreshTransports(newConfig: McpConfig): Promise<void> {
    const oldConfig = this.config;

    // Update the configuration
    this.config = newConfig;

    // Get set of new server IDs
    const newServerIds = new Set(Object.keys(newConfig.mcpServers));

    // Close and remove transports for servers that no longer exist
    for (const [serverId, transport] of this.activeTransports.entries()) {
      if (!newServerIds.has(serverId)) {
        await transport.close?.();
        this.activeTransports.delete(serverId);
      }
    }

    // For servers with changed configurations, close and recreate their transports
    for (const serverId of newServerIds) {
      const oldServer = oldConfig.mcpServers[serverId];
      const newServer = newConfig.mcpServers[serverId];

      if (
        oldServer &&
        JSON.stringify(oldServer) !== JSON.stringify(newServer)
      ) {
        const existingTransport = this.activeTransports.get(serverId);
        if (existingTransport) {
          await existingTransport.close?.();
          this.activeTransports.delete(serverId);
        }
      }
    }
  }
}
