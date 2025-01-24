import { SidebarItem } from "@/components/sidebar/types";
import { McpData, ServerMetadata } from "@/types/server.types";

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
    throw new Error(`No configuration found for server4: ${id}`);

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
    color: metadata.color as
      | "secondary"
      | "success"
      | "warning"
      | "primary"
      | undefined,
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

export function formatServerLabel(
  id: string,
  metadata?: ServerMetadata
): string {
  return metadata?.name || `${id.charAt(0).toUpperCase()}${id.slice(1)} Server`;
}
