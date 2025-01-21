import { SidebarItem } from "@/components/sidebar/types";
import { ServerMetadata } from "./types";
import { McpData } from "@/contexts/McpDataContext";

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

  const serverConfig = mcpData.mcpServers[id];
  if (!serverConfig)
    throw new Error(`No configuration found for server: ${id}`);

  const metadata = {
    ...serverConfig.metadata,
    ...serverMetadata,
    color: isConnected
      ? serverMetadata?.color || serverConfig.metadata?.color || "secondary"
      : "secondary",
  };

  const name =
    metadata.name || `${id.charAt(0).toUpperCase()}${id.slice(1)} Server`;

  return {
    key: `server-${id}`,
    label: name,
    icon: metadata.icon,
    color: metadata.color,
    href: `/servers/${id}`,
    description: metadata.description || name,
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
  return Object.keys(mcpData.mcpServers).reduce((names, id) => {
    names[id] = getServerConfig(id, mcpData).label;
    return names;
  }, {} as Record<string, string>);
}
