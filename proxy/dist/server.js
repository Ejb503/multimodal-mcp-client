import cors from "cors";
import express from "express";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { findActualExecutable } from "spawn-rx";
import mcpProxy from "./mcpProxy.js";
import { McpApiService } from "./services/McpApiService.js";
import { McpHandlers } from "./handlers/mcpHandlers.js";
/**
 * ProxyServer acts as a bridge between web applications and MCP servers.
 * It supports both stdio-based local MCP servers and SSE-based remote MCP servers.
 */
export class ProxyServer {
    constructor(config) {
        this.webAppTransports = [];
        if (!config) {
            throw new Error("Configuration is required");
        }
        if (!config.mcpServers) {
            throw new Error("mcpServers must be defined");
        }
        this.config = config;
        const apiKey = process.env.VITE_SYSTEMPROMPT_API_KEY;
        if (!apiKey) {
            throw new Error("VITE_SYSTEMPROMPT_API_KEY is required but not provided");
        }
        // Local server only - no need for external API
        const baseUrl = process.env.NODE_ENV === "production"
            ? "https://systemprompt.io"
            : "http://127.0.0.1";
        console.log("Using local API at:", baseUrl);
        // Add SSE configuration
        this.config.sse = {
            systemprompt: {
                url: baseUrl,
                apiKey,
            },
        };
        const mcpApiService = new McpApiService(baseUrl, apiKey);
        this.mcpHandlers = new McpHandlers(mcpApiService, this.config);
        this.app = express();
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use((err, req, res, next) => {
            console.error("Express error handler:", err);
            if (!res.headersSent) {
                res.status(500).json({
                    error: err.message || "Internal server error",
                });
            }
            next(err);
        });
    }
    setupRoutes() {
        // SSE and message routes
        this.app.get("/sse", this.handleSSE.bind(this));
        this.app.post("/message", this.handleMessage.bind(this));
        this.app.get("/config", this.handleConfig.bind(this));
        // MCP routes
        this.app.get("/v1/mcp", this.mcpHandlers.handleMcp.bind(this.mcpHandlers));
        this.app.get("/v1/user/mcp", this.mcpHandlers.handleUser.bind(this.mcpHandlers));
        this.app.post("/v1/config/mcp", this.mcpHandlers.handlePostMcpConfig.bind(this.mcpHandlers));
    }
    /**
     * Validates and extracts transport parameters from the request query
     * @param query - The request query
     * @returns The validated transport type and server ID
     * @throws Error if parameters are invalid
     */
    validateTransportParams(query) {
        const serverId = typeof query.serverId === "string" ? query.serverId : "default";
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
    async createTransport(query) {
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
    async createStdioTransport(serverId) {
        console.log(serverId);
        const serverConfig = this.config.mcpServers?.[serverId];
        if (!serverConfig) {
            throw new Error(`No configuration found for server: ${serverId}`);
        }
        console.log(`Setting up stdio transport for server ${serverId}`);
        const processEnv = {};
        Object.entries(process.env).forEach(([key, value]) => {
            if (value !== undefined && typeof value === "string") {
                processEnv[key] = value;
            }
        });
        const env = serverConfig.env
            ? { ...processEnv, ...serverConfig.env }
            : processEnv;
        const { cmd, args } = findActualExecutable(serverConfig.command, serverConfig.args || []);
        const transport = new StdioClientTransport({
            command: cmd,
            args,
            env,
            stderr: "pipe",
        });
        try {
            await transport.start();
            console.log(`Stdio transport started successfully for server ${serverId}`);
            return transport;
        }
        catch (error) {
            console.error(`Failed to start stdio transport for server ${serverId}:`, error);
            throw error;
        }
    }
    /**
     * Creates an SSE transport for the specified server
     * @param serverId - The ID of the server to connect to
     * @returns A promise that resolves to the created transport
     * @throws Error if the configuration is invalid or transport creation fails
     */
    async createSSETransport(serverId) {
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
        }
        catch (error) {
            console.error(`Failed to start SSE transport for server ${serverId}:`, error);
            throw error;
        }
    }
    /**
     * Handles SSE connection requests
     * @param req - The express request object
     * @param res - The express response object
     */
    async handleSSE(req, res) {
        try {
            const backingServerTransport = await this.createTransport(req.query);
            const webAppTransport = new SSEServerTransport("/message", res);
            this.webAppTransports.push(webAppTransport);
            console.log("Starting web app transport");
            await webAppTransport.start();
            console.log("Web app transport started");
            let isConnected = true;
            if (backingServerTransport instanceof StdioClientTransport &&
                backingServerTransport.stderr) {
                this.setupStderrHandler(backingServerTransport, webAppTransport, isConnected);
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
            // Handle client disconnect
            req.on("close", async () => {
                console.log("Client disconnecting...");
                isConnected = false;
                // Remove from tracked transports
                const index = this.webAppTransports.indexOf(webAppTransport);
                if (index > -1) {
                    this.webAppTransports.splice(index, 1);
                }
                // Close both transports immediately
                await Promise.all([
                    webAppTransport.close().catch((error) => {
                        console.error("Error closing web app transport:", error);
                    }),
                    backingServerTransport.close().catch((error) => {
                        console.error("Error closing backing server transport:", error);
                    }),
                ]);
                console.log("Client disconnected");
            });
        }
        catch (error) {
            console.error("Error in /sse route:", error);
            if (!res.headersSent) {
                res.status(500).json({
                    error: error instanceof Error ? error.message : "Internal server error",
                });
            }
        }
    }
    /**
     * Sets up the stderr handler for stdio transports
     */
    setupStderrHandler(backingServerTransport, webAppTransport, isConnected) {
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
            }
            catch (error) {
                console.error("Error sending stderr data:", error);
                isConnected = false;
            }
        });
    }
    /**
     * Creates an error handler for the MCP proxy
     */
    createErrorHandler(webAppTransport, isConnected) {
        return (error) => {
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
            }
            catch (sendError) {
                console.error("Error sending error notification:", sendError);
                isConnected = false;
            }
        };
    }
    /**
     * Handles message requests from clients
     * @param req - The express request object
     * @param res - The express response object
     */
    async handleMessage(req, res) {
        try {
            const sessionId = req.query.sessionId;
            if (typeof sessionId !== "string") {
                res.status(400).end("Session ID must be specified");
                return;
            }
            const transport = this.webAppTransports.find((t) => t.sessionId === sessionId);
            if (!transport) {
                res.status(404).end("Session not found");
                return;
            }
            await transport.handlePostMessage(req, res);
            if (!res.headersSent) {
                res.status(200).end();
            }
        }
        catch (error) {
            console.error("Error in /message route:", error);
            if (!res.headersSent) {
                res.status(500).json({
                    error: error instanceof Error ? error.message : "Internal server error",
                });
            }
        }
    }
    /**
     * Handles configuration requests
     * @param _req - The express request object
     * @param res - The express response object
     */
    handleConfig(_req, res) {
        try {
            if (!this.config?.mcpServers) {
                throw new Error("Invalid server configuration");
            }
            const config = {
                mcpServers: this.config.mcpServers,
            };
            res.status(200).json(config);
        }
        catch (error) {
            console.error("Error in /config route:", error);
            if (!res.headersSent) {
                res.status(500).json({
                    error: error instanceof Error ? error.message : "Internal server error",
                });
            }
        }
    }
    /**
     * Starts the proxy server on the specified port
     * @param port - The port number to listen on
     */
    async startServer(port) {
        return new Promise((resolve) => {
            this.app.listen(port, () => {
                console.log(`Server running on port ${port}`);
                console.log("\nAvailable MCP Servers:");
                if (this.config.mcpServers) {
                    Object.entries(this.config.mcpServers).forEach(([id, config]) => {
                        console.log(`\n${id}:`);
                        if (config.env) {
                            Object.keys(config.env).forEach((key) => {
                                console.log(`    ${key}: [HIDDEN]`);
                            });
                        }
                    });
                }
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
    getExpressApp() {
        return this.app;
    }
    async cleanup() {
        console.log("Cleaning up server resources...");
        await Promise.all(this.webAppTransports.map(async (transport) => {
            try {
                await transport.close?.();
            }
            catch (error) {
                console.error("Error closing transport:", error);
            }
        }));
        this.webAppTransports = [];
        console.log("Cleanup complete");
    }
}
