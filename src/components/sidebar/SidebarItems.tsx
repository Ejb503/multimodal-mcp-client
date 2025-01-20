import { SidebarSection, SidebarItem } from "./types";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { McpContext } from "../../contexts/McpContext";
import { useMcpData } from "../../contexts/McpDataContext";

type ServerType = "stdio" | "sse";

export function useSidebarItems() {
  const navigate = useNavigate();
  const context = useContext(McpContext);
  const { mcpData } = useMcpData();

  if (!context) throw new Error("McpContext must be used within McpProvider");
  if (!mcpData) return { sections: [], handleItemClick: () => {} };

  const { clients } = context;

  const handleItemClick = (href: string | undefined) => {
    if (href) {
      navigate(href);
    }
  };

  // Get server items with current connection state
  const serverItems: SidebarItem[] = Object.entries(
    mcpData.mcpServers || {}
  ).map(([id, config]) => {
    const clientState = clients[id];
    const isConnected = clientState?.connectionStatus === "connected";
    const type = (clientState?.serverType || "stdio") as ServerType;

    // Get the appropriate metadata based on connection state and configuration
    const defaultMetadata =
      type === "stdio" ? mcpData.defaults.serverTypes.stdio : {};

    const metadata =
      isConnected &&
      config &&
      typeof config === "object" &&
      "metadata" in config
        ? {
            ...defaultMetadata,
            ...config.metadata,
          }
        : mcpData.defaults.unconnected;

    return {
      key: id,
      label: id,
      icon: metadata.icon,
      description: metadata.description || `${id} server`,
      href: `/servers/${id}`,
      color: metadata.color,
      serverId: id,
    } as SidebarItem;
  });

  const sections: SidebarSection[] = [
    {
      title: "Main",
      items: [
        {
          key: "control",
          label: "Control Center",
          icon: "solar:server-square-line-duotone",
          description: "Manage MCP servers and modules",
          href: "/control",
          color: "primary",
        },
        {
          key: "home",
          label: "Agents",
          icon: "solar:programming-line-duotone",
          description: "View and manage your agents",
          href: "/agents",
          color: "primary",
        },
        {
          key: "create-agent",
          label: "Create Agent",
          icon: "solar:add-circle-line-duotone",
          description: "Create a new agent",
          href: "/agent/create",
          color: "primary",
        },
      ],
    },
    {
      title: "Servers",
      items: serverItems,
    },
    {
      title: "Settings",
      items: [
        {
          key: "logs",
          label: "Logs",
          icon: "solar:document-text-line-duotone",
          description: "View system logs",
          href: "/logs",
          color: "primary",
        },
        {
          key: "settings",
          label: "Settings",
          icon: "solar:settings-line-duotone",
          description: "Manage your preferences",
          href: "/settings",
          color: "primary",
        },
      ],
    },
    {
      title: "Help",
      items: [
        {
          key: "docs",
          label: "Documentation",
          icon: "solar:book-line-duotone",
          description: "View MCP documentation",
          href: "https://systemprompt.io/docs/mcp-client",
          color: "primary",
        },
      ],
    },
  ];

  return { sections, handleItemClick };
}

export const sectionItemsWithTeams = [];
