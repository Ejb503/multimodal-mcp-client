import { SidebarItem } from "@/components/sidebar/types";
import mcpConfig from "./mcp.config.json";
import {
  McpConfig,
  ServerMetadata,
  SSEServerConfig,
  StdioServerConfig,
} from "./types";
import * as os from "os";
import * as path from "path";

/**
 * Resolves environment variables in a string
 */
function resolveEnvVars(str: string): string {
  return str.replace(/\${([^}]+)}/g, (_, varName) => {
    if (varName === "NPX_PATH") {
      // Platform-specific NPX path resolution
      const isWindows = os.platform() === "win32";
      return isWindows
        ? path.join(
            process.env.PROGRAMFILES || "C:\\Program Files",
            "nodejs",
            "npx.cmd"
          )
        : "npx";
    }
    return process.env[varName] || "";
  });
}

/**
 * Resolves platform-specific configuration for a server
 */
function resolveServerConfig(config: StdioServerConfig): StdioServerConfig {
  return {
    ...config,
    command: resolveEnvVars(config.command),
    args: config.args.map(resolveEnvVars),
    env: config.env
      ? Object.fromEntries(
          Object.entries(config.env).map(([key, value]) => [
            key,
            resolveEnvVars(value),
          ])
        )
      : undefined,
  };
}

/**
 * Determines the server type based on its configuration
 */
export function getServerType(id: string, config: McpConfig): "sse" | "stdio" {
  // Check if this server ID exists in SSE configs
  if (config.sse && id in config.sse) {
    return "sse";
  }
  // Check if this server ID exists in stdio configs
  if (config.mcpServers && id in config.mcpServers) {
    return "stdio";
  }
  // Default to stdio if not found (this maintains backward compatibility)
  return "stdio";
}

/**
 * Gets the raw server configuration from the MCP config
 */
export function getRawServerConfig(
  id: string,
  config: McpConfig
): SSEServerConfig | StdioServerConfig | undefined {
  const serverType = getServerType(id, config);
  const serverConfig =
    serverType === "sse" ? config.sse?.[id] : config.mcpServers[id];
  if (!serverConfig) return undefined;

  return "url" in serverConfig
    ? serverConfig
    : resolveServerConfig(serverConfig);
}

/**
 * Builds metadata for a server based on its configuration and state
 */
export function buildServerMetadata(
  id: string,
  config: McpConfig,
  serverMetadata?: ServerMetadata,
  isConnected: boolean = false
): ServerMetadata {
  const serverType = getServerType(id, config);
  const configMetadata = getRawServerConfig(id, config)?.metadata;
  const typeDefaults = config.defaults.serverTypes[serverType];

  if (isConnected) {
    return {
      ...typeDefaults,
      ...configMetadata,
      ...serverMetadata,
    };
  }

  return {
    ...typeDefaults,
    ...configMetadata,
    color: config.defaults.unconnected.color,
    icon:
      configMetadata?.icon ||
      typeDefaults.icon ||
      config.defaults.unconnected.icon,
    name: serverMetadata?.name,
  };
}

/**
 * Formats a server ID into a display label
 */
export function formatServerLabel(id: string, name?: string): string {
  if (name) return name;
  return `${id.charAt(0).toUpperCase()}${id.slice(1)} Server`;
}

/**
 * Gets the configuration for a single server
 */
export function getServerConfig(
  id: string,
  serverMetadata?: ServerMetadata,
  isConnected: boolean = false
): SidebarItem {
  const config = mcpConfig as McpConfig;
  const metadata = buildServerMetadata(id, config, serverMetadata, isConnected);

  return {
    key: `server-${id}`,
    label: formatServerLabel(id, metadata.name),
    icon: metadata.icon,
    color: metadata.color || "secondary",
    href: `/servers/${id}`,
    description: metadata.description || formatServerLabel(id),
    serverId: id,
    metadata,
  };
}

/**
 * Gets configurations for all servers
 */
export function getServerConfigs(): SidebarItem[] {
  const config = mcpConfig as McpConfig;
  return Object.keys(config.mcpServers).map((id) => getServerConfig(id));
}

/**
 * Gets a mapping of server IDs to their display names
 */
export function getServerNames(): Record<string, string> {
  const config = mcpConfig as McpConfig;
  const serverIds = Object.keys(config.mcpServers);

  return serverIds.reduce((names, id) => {
    names[id] = getServerConfig(id).label;
    return names;
  }, {} as Record<string, string>);
}
