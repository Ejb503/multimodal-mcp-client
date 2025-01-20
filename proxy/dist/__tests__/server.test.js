import { describe, it, expect, beforeEach, vi, afterEach, afterAll, } from "vitest";
import supertest from "supertest";
import { ProxyServer } from "../server.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
// Mock all console methods to suppress output
const mockConsole = {
    log: vi.spyOn(console, "log").mockImplementation(() => { }),
    error: vi.spyOn(console, "error").mockImplementation(() => { }),
    warn: vi.spyOn(console, "warn").mockImplementation(() => { }),
    info: vi.spyOn(console, "info").mockImplementation(() => { }),
};
// Create mock instances
const mockStream = {
    pipe: vi.fn(),
    compose: vi.fn(),
    addListener: vi.fn(),
    once: vi.fn(),
    on: vi.fn(),
    emit: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
    listeners: vi.fn(),
    rawListeners: vi.fn(),
    listenerCount: vi.fn(),
    prependListener: vi.fn(),
    prependOnceListener: vi.fn(),
    eventNames: vi.fn(),
    off: vi.fn(),
    setMaxListeners: vi.fn(),
    getMaxListeners: vi.fn(),
};
// Setup mocks first (these get hoisted)
vi.mock("@modelcontextprotocol/sdk/server/sse.js", () => ({
    SSEServerTransport: vi.fn().mockImplementation(() => ({
        start: vi.fn().mockResolvedValue(undefined),
        send: vi.fn(),
        handlePostMessage: vi.fn().mockResolvedValue(undefined),
        handleMessage: vi.fn(),
        close: vi.fn(),
        _endpoint: "/message",
        res: {},
        _sessionId: "test-session",
        get sessionId() {
            return this._sessionId;
        },
    })),
}));
// Mock McpApiService
vi.mock("../services/McpApiService.js", () => {
    const mockMcpApiService = {
        fetchMcpData: vi.fn().mockResolvedValue({
            available: true,
            mcpServers: {},
        }),
        transformServers: vi.fn().mockReturnValue({
            "core-server": {
                command: "node",
                args: ["-y", "core-server"],
                env: ["API_KEY"],
                metadata: {
                    icon: "test-icon",
                    color: "primary",
                    description: "Test core server",
                    serverType: "core",
                },
            },
        }),
        baseUrl: "",
    };
    return {
        McpApiService: vi.fn().mockImplementation((baseUrl) => ({
            ...mockMcpApiService,
            baseUrl,
        })),
    };
});
vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => {
    class MockStdioTransport {
        constructor() {
            this.stderr = mockStream;
            this.start = vi.fn().mockResolvedValue(undefined);
            this.close = vi.fn();
            this.send = vi.fn();
            this.onmessage = vi.fn();
            this.onclose = vi.fn();
            this._abortController = new AbortController();
            this._readBuffer = "";
            this._serverParams = {};
            this.processReadBuffer = vi.fn();
        }
    }
    return {
        StdioClientTransport: vi
            .fn()
            .mockImplementation(() => new MockStdioTransport()),
    };
});
vi.mock("@modelcontextprotocol/sdk/client/sse.js", () => ({
    SSEClientTransport: vi.fn().mockImplementation(() => ({
        start: vi.fn().mockResolvedValue(undefined),
        close: vi.fn(),
        send: vi.fn(),
        onmessage: vi.fn(),
        onclose: vi.fn(),
    })),
}));
vi.mock("../mcpProxy.js", () => ({
    default: vi.fn().mockImplementation(({ transportToClient }) => {
        // Simulate successful connection
        transportToClient.send({
            jsonrpc: "2.0",
            method: "connection/established",
            params: { status: "connected" },
        });
        return Promise.resolve();
    }),
}));
describe("ProxyServer", () => {
    let server;
    let request;
    const TEST_API_KEY = "test-key";
    const mockConfig = {
        mcpServers: {
            "core-server": {
                command: "node",
                args: ["server.js"],
                env: ["API_KEY"],
                metadata: {
                    icon: "test-icon",
                    color: "primary",
                    description: "Test core server",
                    serverType: "core",
                },
            },
            "custom-server": {
                command: "node",
                args: ["custom.js"],
                env: ["CUSTOM_KEY"],
                metadata: {
                    icon: "custom-icon",
                    color: "secondary",
                    description: "Test custom server",
                    serverType: "custom",
                },
            },
        },
    };
    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers(); // Use fake timers for all tests
        process.env.VITE_SYSTEMPROMPT_API_KEY = TEST_API_KEY;
        process.env.NODE_ENV = "development"; // Ensure we're in development mode
        server = new ProxyServer(mockConfig);
        request = supertest(server.getExpressApp());
        // Clear all console mocks
        Object.values(mockConsole).forEach((mock) => mock.mockClear());
    });
    afterEach(async () => {
        vi.useRealTimers(); // Restore real timers after each test
        // Restore all console mocks
        Object.values(mockConsole).forEach((mock) => mock.mockRestore());
        // Clean up server resources
        await server.cleanup();
        // Wait for any pending operations to complete
        await vi.runAllTimersAsync();
        delete process.env.VITE_SYSTEMPROMPT_API_KEY;
        delete process.env.NODE_ENV;
    });
    afterAll(async () => {
        // Clean up any remaining transports
        await server.cleanup();
        // Wait for any pending operations to complete
        await vi.runAllTimersAsync();
    });
    // Helper function to add API key to requests
    const authenticatedRequest = (req) => req.set("x-systemprompt-api-key", TEST_API_KEY);
    describe("Configuration", () => {
        it("should throw error when config is missing", () => {
            expect(() => new ProxyServer(undefined)).toThrow("Configuration is required");
        });
        it("should throw error when mcpServers is missing", () => {
            expect(() => new ProxyServer({})).toThrow("mcpServers must be defined");
        });
        it("should normalize empty config sections", () => {
            const server = new ProxyServer({ mcpServers: {} });
            expect(server.config.mcpServers).toEqual({});
        });
        it("should use correct URL based on environment", () => {
            // Test development environment
            process.env.NODE_ENV = "development";
            const devServer = new ProxyServer({
                mcpServers: {},
            });
            expect(devServer.mcpApiService.baseUrl).toBe("http://127.0.0.1");
            // Test production environment
            process.env.NODE_ENV = "production";
            const prodServer = new ProxyServer({
                mcpServers: {},
            });
            expect(prodServer.mcpApiService.baseUrl).toBe("https://systemprompt.io");
        });
    });
    describe("API Endpoints", () => {
        describe("GET /v1/mcp", () => {
            it("should return properly structured MCP data", async () => {
                const response = await authenticatedRequest(request)
                    .get("/v1/mcp")
                    .expect("Content-Type", /json/)
                    .expect(200);
                expect(response.body).toHaveProperty("mcpServers");
                expect(response.body).toHaveProperty("defaults");
                // Verify server types are correctly set
                Object.values(response.body.mcpServers).forEach((server) => {
                    expect(server.metadata.serverType).toBe("core");
                });
            });
            it("should handle errors gracefully", async () => {
                // Create a server with invalid config to trigger error
                const badServer = new ProxyServer({
                    mcpServers: {},
                });
                const mockMcpApiService = vi.mocked(badServer.mcpApiService);
                mockMcpApiService.fetchMcpData.mockRejectedValueOnce(new Error("Test error"));
                const response = await authenticatedRequest(supertest(badServer.getExpressApp()))
                    .get("/v1/mcp")
                    .expect("Content-Type", /json/)
                    .expect(500);
                expect(response.body).toHaveProperty("error");
                expect(response.body.error).toBe("Test error");
            });
        });
        describe("GET /v1/user/mcp", () => {
            it("should return user data with API key", async () => {
                const response = await authenticatedRequest(request)
                    .get("/v1/user/mcp")
                    .expect("Content-Type", /json/)
                    .expect(200);
                expect(response.body).toHaveProperty("user");
                expect(response.body).toHaveProperty("api_key", TEST_API_KEY);
            });
        });
        describe("POST /v1/config/mcp", () => {
            it("should update server configuration", async () => {
                const newConfig = {
                    mcpServers: { "new-core": { command: "test", args: [] } },
                };
                // Mock the transformServers to return our new config
                const mockMcpApiService = vi.mocked(server["mcpApiService"]);
                mockMcpApiService.transformServers.mockReturnValueOnce({
                    "new-core": {
                        id: "new-core",
                        status: "disconnected",
                        command: "test",
                        args: ["-y", "new-core"],
                        metadata: {
                            icon: "test-icon",
                            color: "primary",
                            description: "Test core server",
                            serverType: "core",
                        },
                    },
                });
                await authenticatedRequest(request)
                    .post("/v1/config/mcp")
                    .send(newConfig)
                    .expect(200);
                // Verify the config was updated by checking /v1/mcp
                const response = await authenticatedRequest(request)
                    .get("/v1/mcp")
                    .expect(200);
                expect(response.body.mcpServers).toHaveProperty("new-core");
                expect(response.body.mcpServers["new-core"].args).toEqual([
                    "-y",
                    "new-core",
                ]);
            });
        });
    });
    describe("Server Management", () => {
        it("should cleanup resources on shutdown", async () => {
            await server.cleanup();
            // Verify no transports are left
            expect(server.webAppTransports).toHaveLength(0);
        });
        it("should handle core server args correctly", async () => {
            const response = await authenticatedRequest(request)
                .get("/v1/mcp")
                .expect(200);
            // Core servers should have proper args
            Object.entries(response.body.mcpServers).forEach(([id, server]) => {
                const metadata = server.metadata;
                if (metadata &&
                    "serverType" in metadata &&
                    metadata.serverType === "core") {
                    expect(server.args).toEqual(["-y", id]);
                }
            });
        });
        it("should preserve custom server configuration", async () => {
            const customConfig = {
                command: "node",
                args: ["custom.js"],
                env: ["CUSTOM_KEY"],
                metadata: {
                    icon: "custom-icon",
                    color: "secondary",
                    description: "Test custom server",
                    serverType: "custom",
                },
            };
            // Update config with a new custom server
            await authenticatedRequest(request)
                .post("/v1/config/mcp")
                .send({
                mcpServers: { "new-custom": customConfig },
            })
                .expect(200);
            // Mock the transformServers to return our custom config
            const mockMcpApiService = vi.mocked(server.mcpApiService);
            mockMcpApiService.transformServers.mockReturnValueOnce({
                "new-custom": {
                    ...customConfig,
                    id: "new-custom",
                    status: "disconnected",
                },
            });
            // Verify custom server config is preserved
            const response = await authenticatedRequest(request)
                .get("/v1/mcp")
                .expect(200);
            expect(response.body.mcpServers["new-custom"]).toEqual({
                ...customConfig,
                id: "new-custom",
                status: "disconnected",
            });
        });
        it("should handle environment variables correctly", async () => {
            const testKey = "test-env-key";
            process.env.TEST_ENV = testKey;
            const serverWithEnv = {
                command: "node",
                args: ["test.js"],
                env: ["TEST_ENV"],
                metadata: { serverType: "custom" },
            };
            // Mock the transport to avoid actual process creation
            const mockTransport = {
                start: vi.fn().mockImplementation(() => {
                    // Simulate connection established
                    setTimeout(() => {
                        if (mockTransport.onmessage) {
                            mockTransport.onmessage({
                                jsonrpc: "2.0",
                                method: "connection/established",
                                params: { status: "connected" },
                            });
                        }
                    }, 50);
                    return Promise.resolve();
                }),
                close: vi.fn().mockImplementation(() => Promise.resolve()),
                stderr: mockStream,
                onmessage: null,
                onclose: null,
                onerror: null,
                send: vi.fn(),
            };
            vi.mocked(StdioClientTransport).mockImplementationOnce(() => mockTransport);
            // Add server that uses the environment variable
            await authenticatedRequest(request)
                .post("/v1/config/mcp")
                .send({
                mcpServers: { "env-test": serverWithEnv },
            })
                .expect(200);
            // Create a connection and wait for transport to start
            const response = await request
                .get("/sse")
                .query({
                serverId: "env-test",
                transportType: "stdio",
            })
                .expect(200);
            // Wait for connection to be established
            await vi.advanceTimersByTimeAsync(50);
            expect(response.headers["content-type"]).toBe("text/event-stream");
            expect(mockTransport.start).toHaveBeenCalled();
            expect(mockTransport.send).toHaveBeenCalled();
            // Clean up
            await server.cleanup();
            expect(mockTransport.close).toHaveBeenCalled();
            delete process.env.TEST_ENV;
        });
        it("should cleanup transports on connection close", async () => {
            const closeHandler = vi.fn().mockImplementation(() => Promise.resolve());
            // Create a transport that tracks close calls
            const mockTransport = {
                start: vi.fn().mockImplementation(() => {
                    // Simulate connection established
                    setTimeout(() => {
                        if (mockTransport.onmessage) {
                            mockTransport.onmessage({
                                jsonrpc: "2.0",
                                method: "connection/established",
                                params: { status: "connected" },
                            });
                        }
                    }, 50);
                    return Promise.resolve();
                }),
                close: closeHandler,
                stderr: mockStream,
                onmessage: null,
                onclose: null,
                onerror: null,
                send: vi.fn(),
            };
            vi.mocked(StdioClientTransport).mockImplementationOnce(() => mockTransport);
            // Create connection and wait for transport to start
            await request.get("/sse").query({
                serverId: "core-server",
                transportType: "stdio",
            });
            // Wait for connection to be established
            await vi.advanceTimersByTimeAsync(50);
            expect(server.webAppTransports.length).toBe(1);
            expect(mockTransport.send).toHaveBeenCalled();
            // Cleanup and verify
            await server.cleanup();
            expect(closeHandler).toHaveBeenCalled();
            expect(server.webAppTransports.length).toBe(0);
        });
    });
    describe("Transport Management", () => {
        it("should handle transport errors gracefully", async () => {
            // Mock transport error
            const mockTransport = {
                start: vi.fn().mockRejectedValue(new Error("Transport error")),
                close: vi.fn(),
                stderr: mockStream,
                onmessage: null,
                onclose: null,
                onerror: null,
                send: vi.fn(),
            };
            vi.mocked(StdioClientTransport).mockImplementationOnce(() => mockTransport);
            const errorResponse = await request
                .get("/sse")
                .query({
                serverId: "core-server",
                transportType: "stdio",
            })
                .expect(500);
            expect(errorResponse.body.error).toBe("Transport error");
        });
    });
    describe("Configuration Management", () => {
        it("should add warning header to config file", async () => {
            await request
                .post("/v1/config/mcp")
                .send({
                mcpServers: { test: { command: "test" } },
            })
                .expect(200);
            // Verify through /v1/mcp that warning is present
            const configResponse = await request.get("/v1/mcp").expect(200);
            expect(configResponse.body).toHaveProperty("_warning");
            expect(configResponse.body._warning).toBe("This file is automatically generated. DO NOT EDIT DIRECTLY.");
        });
        it("should handle invalid configuration gracefully", async () => {
            const response = await request
                .post("/v1/config/mcp")
                .send({
                mcpServers: null, // Invalid config
            })
                .expect(500);
            expect(response.body.error).toBe("Invalid configuration: mcpServers must be a valid object");
        });
    });
});
