import { Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { findActualExecutable } from "spawn-rx";
import type { McpConfig } from "../types/index.js";
import mcpProxy from "../mcpProxy.js";

type TransportType = "stdio" | "sse";
type Transport = StdioClientTransport | SSEClientTransport;

export class TransportHandlers {
  private webAppTransports: SSEServerTransport[] = [];

  constructor(private config: McpConfig) {}

  /**
   * Validates and extracts transport parameters from the request query
   */
  private validateTransportParams(query: Request["query"]): {
    transportType: TransportType;
    serverId: string;
  } {
    const serverId =
      typeof query.serverId === "string" ? query.serverId : "default";
    const transportType = query.transportType;

    if (transportType !== "stdio" && transportType !== "sse") {
      throw new Error("Invalid transport type specified");
    }

    return { transportType, serverId };
  }

  /**
   * Creates a transport based on the specified type and server ID
   */
  private async createTransport(query: Request["query"]): Promise<Transport> {
    const { transportType, serverId } = this.validateTransportParams(query);
    console.log(`Creating ${transportType} transport for server ${serverId}`);

    if (transportType === "stdio") {
      return this.createStdioTransport(serverId);
    }

    return this.createSSETransport(serverId);
  }

  /**
   * Creates a stdio transport for the specified server
   */
  private async createStdioTransport(
    serverId: string
  ): Promise<StdioClientTransport> {
    const serverConfig = this.config.mcpServers[serverId];
    if (!serverConfig) {
      throw new Error(`No configuration found for server: ${serverId}`);
    }

    console.log(`Setting up stdio transport for server ${serverId}`);
    const env = serverConfig.env
      ? { ...(process.env as Record<string, string>), ...serverConfig.env }
      : (process.env as Record<string, string>);

    const { cmd, args } = findActualExecutable(
      serverConfig.command,
      serverConfig.args || []
    );
    const transport = new StdioClientTransport({
      command: cmd,
      args,
      env,
      stderr: "pipe",
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

  /**
   * Creates an SSE transport for the specified server
   */
  private async createSSETransport(
    serverId: string
  ): Promise<SSEClientTransport> {
    if (!this.config.sse?.systemprompt) {
      throw new Error(`SSE configuration is not available`);
    }

    console.log(`Setting up SSE transport for server ${serverId}`);
    const serverConfig = this.config.sse.systemprompt;
    const url = new URL(serverConfig.url);
    const requestInit: RequestInit = {
      headers: {
        "api-key": process.env.SYSTEMPROMPT_API_KEY || "",
      },
    };

    const transport = new SSEClientTransport(url, { requestInit });
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

  /**
   * Sets up the stderr handler for stdio transports
   */
  private setupStderrHandler(
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
        isConnected = false;
      }
    });
  }

  /**
   * Creates an error handler for the MCP proxy
   */
  private createErrorHandler(
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
        isConnected = false;
      }
    };
  }

  /**
   * Handles connection close events
   */
  private handleConnectionClose(webAppTransport: SSEServerTransport): void {
    const index = this.webAppTransports.indexOf(webAppTransport);
    if (index > -1) {
      this.webAppTransports.splice(index, 1);
      console.log("Web app transport removed");
    }
  }

  /**
   * Handles SSE connection requests
   */
  public async handleSSE(req: Request, res: Response): Promise<void> {
    try {
      const backingServerTransport = await this.createTransport(req.query);
      const webAppTransport = new SSEServerTransport("/message", res);

      this.webAppTransports.push(webAppTransport);
      console.log("Starting web app transport");
      await webAppTransport.start();
      console.log("Web app transport started");

      const isConnected = true;

      if (
        backingServerTransport instanceof StdioClientTransport &&
        backingServerTransport.stderr
      ) {
        this.setupStderrHandler(
          backingServerTransport,
          webAppTransport,
          isConnected
        );
      }

      mcpProxy({
        transportToClient: webAppTransport,
        transportToServer: backingServerTransport,
        onerror: this.createErrorHandler(webAppTransport, isConnected),
      });

      // Send ready event after proxy is set up
      webAppTransport.send({
        jsonrpc: "2.0",
        method: "connection/ready",
        params: {},
      });

      req.on("close", () => this.handleConnectionClose(webAppTransport));
    } catch (error) {
      console.error("Error in /sse route:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error:
            error instanceof Error ? error.message : "Internal server error",
        });
      }
    }
  }

  /**
   * Handles message requests from clients
   */
  public async handleMessage(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.query.sessionId;
      if (typeof sessionId !== "string") {
        res.status(400).end("Session ID must be specified");
        return;
      }

      const transport = this.webAppTransports.find(
        (t) => t.sessionId === sessionId
      );
      if (!transport) {
        res.status(404).end("Session not found");
        return;
      }

      await transport.handlePostMessage(req, res);
      if (!res.headersSent) {
        res.status(200).end();
      }
    } catch (error) {
      console.error("Error in /message route:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error:
            error instanceof Error ? error.message : "Internal server error",
        });
      }
    }
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
