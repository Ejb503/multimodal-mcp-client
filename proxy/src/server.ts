import cors from "cors";
import express, { Express, Request, Response } from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { McpConfig } from "./types/index.js";
import mcpProxy from "./mcpProxy.js";
import { ConfigHandlers } from "./handlers/configHandlers.js";
import { McpHandlers } from "./handlers/mcpHandlers.js";
import { defaults } from "./config/defaults.js";
import {
  loadServerConfig,
  loadUserConfig,
  loadApiKey,
} from "./cli/preflight.js";
import { TransportManager } from "./transports/index.js";
import chalk from "chalk";
import { validateEnvironmentVariables } from "./cli/preflight.js";

/**
 * ProxyServer acts as a bridge between web applications and MCP servers.
 * It supports both stdio-based local MCP servers and SSE-based remote MCP servers.
 */
export class ProxyServer {
  private app: Express;
  private transportManager: TransportManager;
  private configHandlers: ConfigHandlers;
  private mcpHandlers: McpHandlers;
  private server: ReturnType<Express["listen"]> | null = null;
  private isShuttingDown = false;

  constructor(config: McpConfig) {
    const fullConfig = {
      ...config,
      defaults,
    };

    this.app = express();
    this.transportManager = new TransportManager(fullConfig);
    this.configHandlers = new ConfigHandlers(fullConfig);
    this.mcpHandlers = new McpHandlers(fullConfig);

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Creates a new ProxyServer instance with config file checking
   * @param config Initial configuration
   * @returns Promise that resolves to a new ProxyServer instance
   */
  public static async create(): Promise<ProxyServer> {
    try {
      // First validate environment variables
      await validateEnvironmentVariables();

      // Load and verify API key first
      console.log(
        chalk.cyan("\nBefore loadApiKey, process.env.SYSTEMPROMPT_API_KEY ="),
        process.env.SYSTEMPROMPT_API_KEY
      );
      const apiKey = await loadApiKey();
      console.log(chalk.cyan("After loadApiKey, using API key:"), apiKey);

      // Load server configurations using the verified API key
      const config = await loadServerConfig();
      await loadUserConfig(apiKey);

      const server = new ProxyServer(config);

      // Handle process signals for cleanup
      const cleanup = async () => {
        if (server.isShuttingDown) return;
        console.log("\nGracefully shutting down...");
        server.isShuttingDown = true;
        await server.cleanup();
        process.exit(0); // Exit after cleanup since this is a SIGINT/SIGTERM
      };

      // Handle both SIGINT (Ctrl+C) and SIGTERM
      process.once("SIGINT", cleanup);
      process.once("SIGTERM", cleanup);

      return server;
    } catch (error) {
      // If CLI setup fails, log error and exit immediately
      console.error("\n❌ Failed during CLI setup:", error);
      process.exit(1);
    }
  }

  private setupMiddleware(): void {
    this.app.use(cors());
  }

  private setupRoutes(): void {
    this.app.get("/sse", this.handleSSE.bind(this));
    this.app.post("/message", this.handleMessage.bind(this));

    // Config routes
    this.app.get(
      "/config",
      this.configHandlers.handleConfig.bind(this.configHandlers)
    );
    this.app.get(
      "/v1/config/llm",
      this.configHandlers.handleGetLlmConfig.bind(this.configHandlers)
    );
    this.app.get(
      "/v1/config/agent",
      this.configHandlers.handleGetAgentConfig.bind(this.configHandlers)
    );
    this.app.post(
      "/v1/config/agent",
      express.json(),
      this.configHandlers.handlePostAgentConfig.bind(this.configHandlers)
    );

    // MCP routes
    this.app.get("/v1/mcp", async (req: Request, res: Response) => {
      try {
        const response = await this.mcpHandlers.handleGetMcp(req, res);
        // Update transport manager's config with the new config
        if (response) {
          this.transportManager.updateConfig(response);
        }
      } catch (error) {
        console.error("Error in /v1/mcp route:", error);
        if (!res.headersSent) {
          res.status(500).json({
            error:
              error instanceof Error ? error.message : "Internal server error",
          });
        }
      }
    });
    this.app.get(
      "/v1/user/mcp",
      this.mcpHandlers.handleGetUserMcp.bind(this.mcpHandlers)
    );
    this.app.post(
      "/v1/mcp/install",
      express.json(),
      this.mcpHandlers.handleInstallMcp.bind(this.mcpHandlers)
    );
    this.app.delete(
      "/v1/mcp/uninstall",
      express.json(),
      this.mcpHandlers.handleUninstallMcp.bind(this.mcpHandlers)
    );

    // Refresh endpoint
    this.app.post("/v1/mcp/refresh", this.handleRefresh.bind(this));
  }

  private async handleSSE(req: Request, res: Response): Promise<void> {
    try {
      const backingServerTransport =
        await this.transportManager.createTransport(req.query);
      const webAppTransport = new SSEServerTransport("/message", res);

      this.transportManager.addWebAppTransport(webAppTransport);
      await webAppTransport.start();

      const isConnected = true;

      if (
        backingServerTransport instanceof StdioClientTransport &&
        backingServerTransport.stderr
      ) {
        this.transportManager.setupStderrHandler(
          backingServerTransport,
          webAppTransport,
          isConnected
        );
      }

      mcpProxy({
        transportToClient: webAppTransport,
        transportToServer: backingServerTransport,
        onerror: this.transportManager.createErrorHandler(
          webAppTransport,
          isConnected
        ),
      });

      // Send initial ready event through the transport
      webAppTransport.send({
        jsonrpc: "2.0",
        method: "connection/ready",
        params: {},
      });

      req.on("close", () =>
        this.transportManager.removeWebAppTransport(webAppTransport)
      );
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

  private async handleMessage(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.query.sessionId;
      if (typeof sessionId !== "string") {
        res.status(400).end("Session ID must be specified");
        return;
      }

      const transport = this.transportManager.findWebAppTransport(sessionId);
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

  private async handleRefresh(req: Request, res: Response): Promise<void> {
    try {
      // Load fresh server configurations
      const apiKey = process.env.SYSTEMPROMPT_API_KEY;
      if (!apiKey) {
        throw new Error("API key not configured");
      }

      // Reload server and user configurations
      const newConfig = await loadServerConfig();
      await loadUserConfig(apiKey);

      // Update transport manager with new configuration
      await this.transportManager.refreshTransports(newConfig);

      // Update handlers with new configuration
      this.configHandlers = new ConfigHandlers(newConfig);
      this.mcpHandlers = new McpHandlers(newConfig);

      res
        .status(200)
        .json({ status: "Server configurations refreshed successfully" });
    } catch (error) {
      console.error("Error refreshing server configurations:", error);
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Internal server error during refresh",
      });
    }
  }

  public async startServer(port: number): Promise<void> {
    const maxRetries = 10;
    const startPort = port;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const currentPort = startPort + attempt;
        await new Promise<void>((resolve, reject) => {
          if (this.server) {
            this.server.close();
          }

          this.server = this.app.listen(currentPort, () => {
            const boxWidth = 60;
            const message = `Server running on port ${currentPort}`;
            const padding = Math.max(0, boxWidth - message.length - 2);
            const leftPad = Math.floor(padding / 2);
            const rightPad = padding - leftPad;

            console.log(chalk.cyan("\n┌" + "─".repeat(boxWidth) + "┐"));
            console.log(
              chalk.cyan("│") +
                " ".repeat(leftPad) +
                chalk.green(message) +
                " ".repeat(rightPad) +
                chalk.cyan("│")
            );
            console.log(chalk.cyan("└" + "─".repeat(boxWidth) + "┘\n"));

            // Print welcome message after server is ready
            console.log(chalk.bold("\n🎉 Welcome to Systemprompt!"));
            console.log(chalk.gray("Your AI assistant is ready to help.\n"));

            // Print quick start guide
            console.log(chalk.yellow("Quick Start:"));
            console.log(
              chalk.gray("• Client running on port: 5173"),
              chalk.cyan(`http://localhost:5173`)
            );
            console.log(
              chalk.gray("• Press"),
              chalk.cyan("Ctrl+C"),
              chalk.gray("to stop the server")
            );
            console.log(
              chalk.gray("• View logs below for real-time updates\n")
            );

            console.log(chalk.dim("─".repeat(boxWidth)));
            console.log(chalk.dim("Server Logs:"));
            resolve();
          });

          this.server.on("error", (err: NodeJS.ErrnoException) => {
            if (err.code === "EADDRINUSE") {
              console.log(
                chalk.yellow(
                  `Port ${currentPort} is in use, trying next port...`
                )
              );
              this.server?.close();
              this.server = null;
            }
            reject(err);
          });
        });
        return; // Successfully started server
      } catch (err: unknown) {
        const error = err as Error;
        if (this.server) {
          this.server.close();
          this.server = null;
        }
        if (attempt === maxRetries - 1) {
          throw new Error(
            `Failed to start server after ${maxRetries} attempts. Last error: ${error.message}`
          );
        }
        // Continue to next attempt if not the last try
      }
    }
  }

  public getExpressApp(): Express {
    return this.app;
  }

  public async cleanup(): Promise<void> {
    if (this.isShuttingDown) return;

    console.log(chalk.yellow("\n\nGracefully shutting down..."));
    console.log(chalk.dim("─".repeat(60)));

    console.log(chalk.gray("• Cleaning up server resources..."));
    if (this.server) {
      await new Promise<void>((resolve) => {
        // Force close any remaining connections
        this.server?.close(() => {
          // Destroy any remaining sockets
          this.server?.getConnections((err, count) => {
            if (!err && count > 0) {
              console.log(
                chalk.gray(`• Closing ${count} remaining connections...`)
              );
              // @ts-expect-error Server internals needed for cleanup
              const connections = this.server?._connections as Set<
                import("net").Socket
              >;
              connections?.forEach((socket) => socket.destroy());
            }
            resolve();
          });
        });
      });
      this.server = null;
    }
    await this.transportManager.cleanup();
    console.log(chalk.gray("• Cleanup complete"));
    console.log(chalk.green("\n👋 Thank you for using Systemprompt!\n"));
  }
}
