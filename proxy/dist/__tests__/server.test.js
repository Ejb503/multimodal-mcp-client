import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestServer, createTestClient } from "./utils/server.js";
import { findActualExecutable } from "spawn-rx";
import axios from "axios";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Stream } from "stream";
import { EventEmitter } from "events";
import { ProxyServer } from "../server.js";
import mcpProxy from "../mcpProxy.js";
vi.mock("@modelcontextprotocol/sdk/server/sse.js");
vi.mock("@modelcontextprotocol/sdk/client/stdio.js");
vi.mock("../mcpProxy.js");
const mockConfig = {
    defaults: {
        serverTypes: {
            stdio: {
                name: "stdio",
                description: "Standard input/output transport",
            },
            sse: {
                name: "sse",
                description: "Server-sent events transport",
            },
        },
        unconnected: {
            name: "Not connected",
            description: "No connection established",
        },
    },
    mcpServers: {
        default: {
            command: "echo",
            args: ["test"],
        },
    },
};
// Mock the SDK modules before any imports
vi.mock("@modelcontextprotocol/sdk/client/stdio.js", () => ({
    StdioClientTransport: vi.fn().mockImplementation(() => ({
        start: vi.fn().mockResolvedValue(undefined),
        stderr: new Stream(),
        close: vi.fn().mockResolvedValue(undefined),
        send: vi.fn(),
        on: vi.fn(),
        removeAllListeners: vi.fn(),
    })),
}));
vi.mock("@modelcontextprotocol/sdk/server/sse.js", () => ({
    SSEServerTransport: vi.fn().mockImplementation(() => ({
        start: vi.fn().mockResolvedValue(undefined),
        send: vi.fn(),
        close: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        removeAllListeners: vi.fn(),
        emit: vi.fn(),
    })),
}));
vi.mock("spawn-rx", () => ({
    findActualExecutable: vi.fn().mockReturnValue({
        cmd: "echo",
        args: ["test"],
    }),
}));
vi.mock("axios");
const mockedAxios = vi.mocked(axios);
const mockedStdioTransport = vi.mocked(StdioClientTransport);
const mockedSSETransport = vi.mocked(SSEServerTransport);
describe("ProxyServer", () => {
    let server;
    let client;
    const originalEnv = process.env;
    beforeEach(() => {
        process.env = { ...originalEnv };
        process.env.SYSTEMPROMPT_API_KEY = "test-api-key";
        const config = {
            mcpServers: {
                default: {
                    command: "echo",
                    args: ["test"],
                },
            },
        };
        server = createTestServer(config);
        client = createTestClient(server.app);
        // Reset mocks
        vi.mocked(mockedAxios.get).mockReset();
        vi.mocked(mockedAxios.post).mockReset();
        vi.mocked(findActualExecutable).mockReset();
        vi.mocked(mockedStdioTransport).mockReset();
        vi.mocked(mockedSSETransport).mockReset();
    });
    afterEach(async () => {
        process.env = originalEnv;
        await server.server.cleanup();
    });
    describe("Config endpoints", () => {
        it("GET /config should return server configuration", async () => {
            const response = await client.get("/config");
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("mcpServers");
            expect(response.body.mcpServers).toHaveProperty("default");
        });
        it("GET /v1/config/llm should return LLM configuration", async () => {
            const response = await client.get("/v1/config/llm");
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("provider", "gemini");
            expect(response.body).toHaveProperty("config");
        });
        it("GET /v1/config/agent should return agent configuration", async () => {
            const response = await client.get("/v1/config/agent");
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("agents");
            expect(response.body.agents).toBeInstanceOf(Array);
        });
    });
    describe("MCP endpoints", () => {
        it("GET /v1/mcp should return MCP configuration", async () => {
            const networkError = new Error("Network error");
            networkError.code = "ECONNREFUSED";
            vi.mocked(mockedAxios.get).mockRejectedValueOnce(networkError);
            const response = await client.get("/v1/mcp");
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("mcpServers");
            expect(response.body.mcpServers).toHaveProperty("default");
            expect(response.body).not.toHaveProperty("_warning");
        });
        it("GET /v1/user/mcp should return user MCP configuration", async () => {
            vi.mocked(mockedAxios.get).mockRejectedValueOnce(new Error("Network error"));
            const response = await client.get("/v1/user/mcp");
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty("user");
            expect(response.body.user).toHaveProperty("name", "Default User");
        });
    });
    describe("SSE connection", () => {
        let mockTransportManager;
        let mockSSETransport;
        let mockResponse;
        let mockRequest;
        let server;
        beforeEach(() => {
            const responseEmitter = new EventEmitter();
            const requestEmitter = new EventEmitter();
            mockRequest = {
                query: { transport: "sse" },
                on: vi.fn(),
                once: vi.fn(),
                emit: requestEmitter.emit.bind(requestEmitter),
                removeListener: vi.fn(),
            };
            mockResponse = {
                setHeader: vi.fn(),
                status: vi.fn().mockReturnThis(),
                json: vi.fn().mockReturnThis(),
                write: vi.fn(),
                end: vi.fn(),
                on: vi.fn(),
                once: vi.fn(),
                emit: responseEmitter.emit.bind(responseEmitter),
                removeListener: vi.fn(),
                headersSent: false,
            };
            const startMock = vi.fn().mockResolvedValue(undefined);
            mockSSETransport = {
                start: startMock,
                close: vi.fn().mockResolvedValue(undefined),
                send: vi.fn(),
                on: vi.fn(),
                once: vi.fn(),
                emit: vi.fn(),
                removeListener: vi.fn(),
                addListener: vi.fn(),
                removeAllListeners: vi.fn(),
                _endpoint: "/message",
                res: mockResponse,
                _sessionId: "test",
                handlePostMessage: vi.fn(),
            };
            mockTransportManager = {
                createTransport: vi.fn().mockResolvedValue(mockSSETransport),
                addWebAppTransport: vi.fn(),
                removeWebAppTransport: vi.fn(),
                setupStderrHandler: vi.fn(),
                createErrorHandler: vi.fn(),
                findWebAppTransport: vi.fn(),
            };
            vi.mocked(SSEServerTransport).mockImplementation((_path, res) => {
                res.setHeader("Content-Type", "text/event-stream");
                return mockSSETransport;
            });
            server = new ProxyServer(mockConfig);
            // Using Object.defineProperty to avoid TypeScript errors when accessing private members
            Object.defineProperty(server, "transportManager", {
                value: mockTransportManager,
                writable: true,
                configurable: true,
            });
        });
        describe("HTTP endpoints", () => {
            it("should accept valid transport type", async () => {
                // Using Object.defineProperty to avoid TypeScript errors when accessing private methods
                const handleSSE = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(server), "handleSSE")?.value.bind(server);
                await handleSSE(mockRequest, mockResponse);
                expect(mockResponse.setHeader).toHaveBeenCalledWith("Content-Type", "text/event-stream");
                expect(mockTransportManager.createTransport).toHaveBeenCalledWith({
                    transport: "sse",
                });
                expect(mockTransportManager.addWebAppTransport).toHaveBeenCalledWith(mockSSETransport);
                expect(mockSSETransport.start).toHaveBeenCalled();
                expect(mockSSETransport.send).toHaveBeenCalledWith({
                    jsonrpc: "2.0",
                    method: "connection/ready",
                    params: {},
                });
            });
            it("should handle transport start failure", async () => {
                const startMock = mockSSETransport.start;
                startMock.mockRejectedValueOnce(new Error("Start failed"));
                const handleSSE = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(server), "handleSSE")?.value.bind(server);
                await handleSSE(mockRequest, mockResponse);
                expect(mockResponse.status).toHaveBeenCalledWith(500);
                expect(mockResponse.json).toHaveBeenCalledWith({
                    error: "Start failed",
                });
            });
            it("should handle transport cleanup on connection close", async () => {
                const handleSSE = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(server), "handleSSE")?.value.bind(server);
                await handleSSE(mockRequest, mockResponse);
                // Get the close handler that was registered
                const closeHandler = mockRequest.on.mock.calls.find(([event]) => event === "close")?.[1];
                // Call the handler directly
                closeHandler?.();
                expect(mockTransportManager.removeWebAppTransport).toHaveBeenCalledWith(mockSSETransport);
            });
        });
        describe("Transport error handling", () => {
            it("should handle transport errors", async () => {
                const errorHandler = vi.fn();
                mockTransportManager.createErrorHandler.mockReturnValue(errorHandler);
                const handleSSE = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(server), "handleSSE")?.value.bind(server);
                await handleSSE(mockRequest, mockResponse);
                // Get the mcpProxy call
                const mcpProxyCall = vi.mocked(mcpProxy).mock.calls[0][0];
                const onError = mcpProxyCall.onerror;
                // Call the error handler directly
                onError(new Error("Transport error"));
                expect(errorHandler).toHaveBeenCalledWith(new Error("Transport error"));
            });
        });
    });
});
