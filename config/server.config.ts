import { SidebarItem } from "@/components/sidebar/types";
import { ServerMetadata, StdioServerConfig } from "./types";
import { McpData } from "@/contexts/McpDataContext";
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
    env: config.env,
    metadata: config.metadata,
  };
}

/**
 * Gets the raw server configuration from the MCP data
 */
export function getRawServerConfig(
  id: string,
  mcpData: McpData
): StdioServerConfig | undefined {
  const serverConfig = mcpData.mcpServers[id];
  if (!serverConfig) return undefined;
  return resolveServerConfig(serverConfig);
}

/**
 * Builds metadata for a server based on its configuration and state
 */
export function buildServerMetadata(
  id: string,
  mcpData: McpData,
  serverMetadata?: ServerMetadata,
  isConnected: boolean = false
): ServerMetadata {
  const configMetadata = getRawServerConfig(id, mcpData)?.metadata;
  const typeDefaults = mcpData.defaults.serverTypes.stdio;

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
    color: mcpData.defaults.unconnected.color,
    icon:
      configMetadata?.icon ||
      typeDefaults.icon ||
      mcpData.defaults.unconnected.icon,
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
  mcpData: McpData,
  serverMetadata?: ServerMetadata,
  isConnected: boolean = false
): SidebarItem {
  if (!mcpData) throw new Error("MCP data not available");

  const metadata = buildServerMetadata(
    id,
    mcpData,
    serverMetadata,
    isConnected
  );

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
export function getServerConfigs(mcpData: McpData): SidebarItem[] {
  if (!mcpData) throw new Error("MCP data not available");
  return Object.keys(mcpData.mcpServers).map((id) =>
    getServerConfig(id, mcpData)
  );
}

/**
 * Gets a mapping of server IDs to their display names
 */
export function getServerNames(mcpData: McpData): Record<string, string> {
  if (!mcpData) throw new Error("MCP data not available");
  const serverIds = Object.keys(mcpData.mcpServers);
  return serverIds.reduce((names, id) => {
    names[id] = getServerConfig(id, mcpData).label;
    return names;
  }, {} as Record<string, string>);
}
