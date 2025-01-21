import type { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ServerDefaults } from "./server.types.js";

export type TransportType = "stdio" | "sse";
export type Transport = StdioClientTransport | SSEClientTransport;

export interface ServerMetadata {
  icon?: string;
  color?: string;
  description?: string;
  serverType?: "core" | "custom";
}

export interface ServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  metadata?: ServerMetadata;
}

export interface ApiServerConfig {
  url: string;
  apiKey: string;
}

export interface SSEConfig {
  url: string;
  apiKey: string;
}

export interface McpConfig {
  mcpServers: Record<string, ServerConfig>;
  customServers?: Record<string, ServerConfig>;
  sse?: {
    systemprompt: {
      url: string;
      apiKey: string;
    };
  };
  defaults?: ServerDefaults;
}

export interface JsonRpcMessage {
  jsonrpc: "2.0";
  method: string;
  params?: unknown;
  id?: string | number;
}

export interface TransformedMcpData {
  mcpServers: Record<string, ServerConfig>;
  available: Record<string, boolean>;
  defaults: Record<string, unknown>;
  _warning?: string;
}

export * from "./server.types.js";
