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
 * @returns Mapped environment variables
 */
export function mapEnvironmentVariables(
  envConfig: Record<string, unknown> | string[] = {},
  baseEnv: Record<string, string> = process.env as Record<string, string>
): Record<string, string> {
  // Start with a fresh environment
  const env: Record<string, string> = {};

  // Handle array-style environment variables
  if (Array.isArray(envConfig)) {
    envConfig.forEach((key) => {
      if (typeof key === "string" && baseEnv[key]) {
        env[key] = baseEnv[key];
      }
    });
    return env;
  }

  // Handle object-style environment variables
  Object.entries(envConfig).forEach(([key, value]) => {
    if (!isNaN(Number(key)) && typeof value === "string" && baseEnv[value]) {
      // For array-style env vars, use the env var name as the key
      env[value] = baseEnv[value];
    } else if (typeof value === "string") {
      // For direct key-value pairs
      env[key] = value;
    }
  });

  return env;
}

export class TransportManager {
  private webAppTransports: SSEServerTransport[] = [];
  private config: McpConfig;

  constructor(config: McpConfig) {
    this.config = config;
    console.log(
      "Transport manager initialized with config:",
      Object.entries(config.mcpServers)
        .filter(([name]) => name.startsWith("systemprompt-mcp-"))
        .map(([name, server]) => ({
          name,
          command: server.command,
          args: server.args,
        }))
    );
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
    console.log(`Creating ${transportType} transport for server ${serverId}`);

    if (transportType === "stdio") {
      return this.createStdioTransport(serverId);
    }

    return this.createSSETransport(serverId);
  }

  private async createStdioTransport(
    serverId: string
  ): Promise<StdioClientTransport> {
    const serverConfig = this.config.mcpServers[serverId];
    if (!serverConfig) {
      throw new Error(`No configuration found for server: ${serverId}`);
    }

    if (!serverConfig.command || serverConfig.command.trim() === "") {
      throw new Error("Server command is required for stdio transport");
    }

    console.log(`Setting up stdio transport for server ${serverId}`);
    console.log("Server config:", JSON.stringify(serverConfig, null, 2));
    console.log("Full server config:", {
      command: serverConfig.command,
      args: serverConfig.args,
      env: serverConfig.env,
    });

    // Map environment variables
    const env = mapEnvironmentVariables(serverConfig.env);
    console.log("Mapped environment:", env);

    // Debug log the mapped environment
    const mappedEnvOnly = Object.fromEntries(
      Object.entries(env).filter(
        ([key]) =>
          serverConfig.env && Object.values(serverConfig.env).includes(key)
      )
    );
    console.log("Server environment:", mappedEnvOnly);

    const transport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args || [],
      env,
      stderr: "pipe",
    });
    console.log("Transport config:", {
      command: serverConfig.command,
      args: serverConfig.args || [],
      env: Object.keys(env),
    });

    try {
      await transport.start();
      console.log(
        `Stdio transport started successfully for server ${serverId}`
      );
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
    if (!this.config.sse?.systemprompt) {
      throw new Error(`SSE configuration is not available`);
    }

    console.log(`Setting up SSE transport for server ${serverId}`);
    const serverConfig = this.config.sse.systemprompt;
    const url = new URL(serverConfig.url);
    url.searchParams.set("apiKey", serverConfig.apiKey);

    const transport = new SSEClientTransport(url);
    try {
      await transport.start();
      console.log(`SSE transport started successfully for server ${serverId}`);
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
      console.log("Web app transport removed");
    }
  }

  public findWebAppTransport(
    sessionId: string
  ): SSEServerTransport | undefined {
    return this.webAppTransports.find((t) => t.sessionId === sessionId);
  }

  public async cleanup(): Promise<void> {
    console.log("Cleaning up transport resources...");
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
    console.log("Transport cleanup complete");
  }
}
