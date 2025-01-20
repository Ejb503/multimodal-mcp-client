import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type {
  CallToolResultSchema,
  Prompt,
  Resource,
  Tool,
  CreateMessageRequest,
  CreateMessageResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { z } from "zod";
import type { ServerMetadata } from "../../config/types";

export type { ServerMetadata };
export type ToolCall = z.infer<typeof CallToolResultSchema>;

export interface ExperimentalCapabilities {
  sampling?: {
    /**
     * Whether this server supports sampling requests.
     */
    sample?: boolean;
  };
  [key: string]: unknown;
}

export interface ServerCapabilities {
  /**
   * Experimental, non-standard capabilities that the server supports.
   */
  experimental?: ExperimentalCapabilities;
  /**
   * Present if the server supports sending log messages to the client.
   */
  logging?: object;
  /**
   * Present if the server offers any prompt templates.
   */
  prompts?: {
    /**
     * Whether this server supports notifications for changes to the prompt list.
     */
    listChanged?: boolean;
  };
  /**
   * Present if the server offers any resources to read.
   */
  resources?: {
    /**
     * Whether this server supports subscribing to resource updates.
     */
    subscribe?: boolean;
    /**
     * Whether this server supports notifications for changes to the resource list.
     */
    listChanged?: boolean;
  };
  /**
   * Present if the server offers any tools to call.
   */
  tools?: {
    /**
     * Whether this server supports notifications for changes to the tool list.
     */
    listChanged?: boolean;
  };
  sampling?: object;
}

export interface McpClientState {
  client: Client | null;
  connectionStatus: "disconnected" | "pending" | "connected" | "error";
  serverType: "stdio" | "sse";
  serverUrl: string;
  apiKey: string;
  resources: Resource[];
  prompts: Prompt[];
  tools: Tool[];
  loadedResources: string[];
  serverInfo?: {
    name: string;
    version: string;
    protocolVersion: string;
    capabilities: ServerCapabilities;
    metadata?: ServerMetadata;
  };
  selectedPrompt?: unknown;
  serverConfig?: {
    key: string;
    label: string;
    icon?: string;
    color?: "success" | "warning" | "primary" | "secondary";
    href?: string;
    description?: string;
    serverId?: string;
    metadata?: ServerMetadata;
  };
  onProgress?: (status: string) => void;
}

export interface McpContextType {
  /** Map of server IDs to their client states */
  clients: Record<string, McpClientState>;
  /** List of currently connected server IDs */
  activeClients: string[];
  /** Connect to a server by its ID */
  connectServer: (serverId: string) => Promise<void>;
  /** Disconnect from a server by its ID */
  disconnectServer: (serverId: string) => Promise<void>;
  /** Select a prompt on a server */
  selectPrompt: (serverId: string, promptId: string) => Promise<void>;
  /** Execute a prompt on a server */
  executePrompt: (
    serverId: string,
    params: { name: string; args: Record<string, unknown> }
  ) => Promise<
    Prompt & {
      _meta?: {
        responseSchema?: Record<string, unknown>;
        complexResponseSchema?: Record<string, unknown>;
      };
    }
  >;
  /** List available resources on a server */
  listResources: (serverId: string) => Promise<void>;
  /** List available prompts on a server */
  listPrompts: (serverId: string) => Promise<void>;
  /** List available tools on a server */
  listTools: (serverId: string) => Promise<void>;
  /** Execute a tool on a server */
  executeTool: (
    serverId: string,
    params: { name: string; args: Record<string, unknown> }
  ) => Promise<ToolCall>;
  /** Read a resource from a server */
  readResource: (serverId: string, resourceName: string) => Promise<unknown>;
  /** Request sampling from a server */
  requestSampling: (
    serverId: string,
    request: CreateMessageRequest["params"]
  ) => Promise<CreateMessageResult>;
  /** List of pending sampling requests */
  pendingSampleRequests: Array<{
    id: number;
    serverId: string;
    request: CreateMessageRequest["params"];
    resolve: (result: CreateMessageResult) => void;
    reject: (error: Error) => void;
  }>;
  /** Handle approving a sampling request */
  handleApproveSampling: (
    id: number,
    response: CreateMessageResult
  ) => Promise<void>;
  /** Handle rejecting a sampling request */
  handleRejectSampling: (id: number) => void;
}
