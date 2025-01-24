import { McpModuleMetadata } from "./index.js";
import { SystempromptModule } from "./systemprompt.js";

export interface ServerMetadata {
  icon?: string;
  color?: string;
  description?: string;
  serverType?: "core" | "custom";
  name?: string;
}

export interface ServerConfig {
  id: string;
  command: string;
  args: string[];
  env?: string[];
  metadata?: ServerMetadata;
}

export interface ServerDefaults {
  serverTypes: {
    stdio: ServerMetadata;
    sse: ServerMetadata;
  };
  unconnected: ServerMetadata;
}

export const DEFAULT_SERVER_CONFIG: ServerDefaults = {
  serverTypes: {
    stdio: {
      icon: "solar:server-minimalistic-bold-duotone",
      color: "primary",
      description: "Local stdio-based MCP server",
    },
    sse: {
      icon: "solar:server-square-cloud-bold-duotone",
      color: "primary",
      description: "Remote SSE-based MCP server",
    },
  },
  unconnected: {
    icon: "solar:server-broken",
    color: "secondary",
    description: "Remote MCP server (not connected)",
  },
};

export interface ServerResponse {
  mcpServers: Record<string, ServerConfig>;
  customServers: Record<string, ServerConfig>;
  available: Record<string, unknown>;
  defaults: ServerDefaults;
}

export interface McpServer extends ServerConfig {
  id: string;
  type: string;
  title: string;
  description: string;
  metadata: ServerMetadata & Partial<McpModuleMetadata>;
}

export interface McpDataInterface {
  mcpServers: Record<string, McpServer>;
  defaults: ServerDefaults;
  available: Record<string, SystempromptModule>;
}
