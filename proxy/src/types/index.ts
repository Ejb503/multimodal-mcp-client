import type { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import type { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { ServerDefaults } from "./server.types.js";
import { SystempromptAgent } from "./systemprompt.js";

export type TransportType = "stdio" | "sse";
export type Transport = StdioClientTransport | SSEClientTransport;

export interface ServerMetadata {
  icon?: string;
  color?: string;
  description?: string;
  serverType?: "core" | "custom";
}

export interface BackendServerConfig {
  env?: string[];
  metadata?: {
    icon?: string;
    description?: string;
  };
  agent?: unknown[];
}

export interface ServerConfig {
  id: string; // Module ID from the backend
  command: string;
  args: string[];
  env?: Record<string, string>;
  metadata?: Record<string, unknown>;
  agent?: unknown[];
}

export interface ServerConfigInput {
  command: string;
  args?: string[];
  env?: Record<string, string> | string[];
  metadata?: ServerMetadata;
  agent?: unknown[];
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
  available: Record<string, McpModuleInfo>;
  defaults?: ServerDefaults;
  agents: SystempromptAgent[];
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

export interface McpModuleMetadata {
  created: string;
  updated: string;
  version: number;
  status: string;
}

export interface McpBlock {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
  annotations: {
    audience: string[];
    priority: number;
  };
  _meta: {
    id: string;
  };
}

export interface McpPrompt {
  name: string;
  description: string;
  arguments: Array<{
    name: string;
    value: string;
  }>;
  _meta: Array<{
    id: string;
    instruction: {
      static: string;
      dynamic: string;
      state: null;
    };
    input: {
      name: string;
      description: string;
      schema: object;
      type: string[];
      reference: any[];
    };
    output: {
      name: string;
      description: string;
      schema: object;
      type: string[];
      reference: any[];
    };
    metadata: {
      title: string;
      description: string;
      created: string;
      updated: string;
      version: number;
      status: string;
      tag: string[];
    };
    _link: string;
  }>;
}

export interface McpAgent {
  id: string;
  type: string;
  content: string;
  metadata: {
    title: string;
    description: string;
    tag: string[];
    created: string;
    updated: string;
    version: number;
    status: string;
  };
  _link: string;
}

export interface McpModuleInfo {
  id: string;
  type: string;
  title: string;
  description: string;
  environment_variables: string[];
  github_link: string;
  icon: string;
  npm_link: string;
  metadata: McpModuleMetadata;
  block: McpBlock | null;
  prompt: McpPrompt | null;
  agent: McpAgent[];
  _link: string;
}

export interface McpServiceResponse {
  installed: Array<{
    type: string;
    name: string;
    id: string;
    _link: string;
  }>;
  available: {
    [key: string]: McpModuleInfo;
  };
}

export * from "./server.types.js";
