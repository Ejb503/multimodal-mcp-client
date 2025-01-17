import cors from "cors";
import express, { Express, Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { findActualExecutable } from "spawn-rx";
import type { McpConfig } from "./types/index.js";
import mcpProxy from "./mcpProxy.js";

type TransportType = "stdio" | "sse";
type Transport = StdioClientTransport | SSEClientTransport;

/**
 * ProxyServer acts as a bridge between web applications and MCP servers.
 * It supports both stdio-based local MCP servers and SSE-based remote MCP servers.
 */
export class ProxyServer {
  private app: Express;
  private webAppTransports: SSEServerTransport[] = [];
  private config: McpConfig;

  constructor(config: McpConfig) {
    this.config = config;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
  }

  private setupRoutes(): void {
    this.app.get("/sse", this.handleSSE.bind(this));
    this.app.post("/message", this.handleMessage.bind(this));
    this.app.get("/config", this.handleConfig.bind(this));
  }

  /**
   * Validates and extracts transport parameters from the request query
   * @param query - The request query
   * @returns The validated transport type and server ID
   * @throws Error if parameters are invalid
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
   * @param query - The request query containing transportType and serverId
   * @returns A promise that resolves to the created transport
   * @throws Error if the configuration is invalid or transport creation fails
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
   * @param serverId - The ID of the server to connect to
   * @returns A promise that resolves to the created transport
   * @throws Error if the configuration is invalid or transport creation fails
   */
  private async createStdioTransport(
    serverId: string
  ): Promise<StdioClientTransport> {
    console.log(serverId);
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
      serverConfig.args
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
   * @param serverId - The ID of the server to connect to
   * @returns A promise that resolves to the created transport
   * @throws Error if the configuration is invalid or transport creation fails
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

  /**
   * Handles SSE connection requests
   * @param req - The express request object
   * @param res - The express response object
   */
  private async handleSSE(req: Request, res: Response): Promise<void> {
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

      // Send initial ready event through the transport
      webAppTransport.send({
        jsonrpc: "2.0",
        method: "connection/ready",
        params: {},
      });

      mcpProxy({
        transportToClient: webAppTransport,
        transportToServer: backingServerTransport,
        onerror: this.createErrorHandler(webAppTransport, isConnected),
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
   * Handles message requests from clients
   * @param req - The express request object
   * @param res - The express response object
   */
  private async handleMessage(req: Request, res: Response): Promise<void> {
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

  /**
   * Handles configuration requests
   * @param _req - The express request object
   * @param res - The express response object
   */
  private handleConfig(_req: Request, res: Response): void {
    try {
      if (!this.config?.mcpServers) {
        throw new Error("Invalid server configuration");
      }
      const config = {
        mcpServers: this.config.mcpServers,
      };
      res.status(200).json(config);
    } catch (error) {
      console.error("Error in /config route:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error:
            error instanceof Error ? error.message : "Internal server error",
        });
      }
    }
  }

  /**
   * Starts the proxy server on the specified port
   * @param port - The port number to listen on
   */
  public async startServer(port: number): Promise<void> {
    return new Promise((resolve) => {
      this.app.listen(port, () => {
        console.log(`Server running on port ${port}`);
        console.log("\nAvailable MCP Servers:");
        Object.entries(this.config.mcpServers).forEach(([id, config]) => {
          console.log(`\n${id}:`);
          if (config.env) {
            Object.keys(config.env).forEach((key) => {
              console.log(`    ${key}: [HIDDEN]`);
            });
          }
        });

        if (this.config.sse) {
          console.log("\nSSE Endpoints:");
          Object.entries(this.config.sse).forEach(([id, config]) => {
            console.log(`\n${id}:`);
            console.log(`  URL: ${config.url}`);
            console.log(`  API Key: [HIDDEN]`);
          });
        }
        resolve();
      });
    });
  }

  public getExpressApp(): Express {
    return this.app;
  }

  public async cleanup(): Promise<void> {
    console.log("Cleaning up server resources...");
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
    console.log("Cleanup complete");
  }
}
