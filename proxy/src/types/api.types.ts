import type { ServerConfig, ServerDefaults } from "./server.types.js";

export interface ApiServerMetadata {
  icon?: string;
  color?: string;
  description?: string;
  serverType?: string;
}

export interface ApiServerConfig {
  id: string;
  status: "connected" | "disconnected" | "error";
  error?: string;
  command: string;
  args: string[];
  env?: string[];
  metadata: {
    icon: string;
    color: string;
    description: string;
    serverType: "core" | "custom";
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  error?: string;
  body: T;
}

export interface TransformedMcpData {
  mcpServers: Record<string, ApiServerConfig>;
  available: Record<string, unknown>;
  defaults: ServerDefaults;
}
