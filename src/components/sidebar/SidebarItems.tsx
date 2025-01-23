import { SidebarSection, SidebarItem } from "./types";
import { useNavigate } from "react-router-dom";
import { useContext } from "react";
import { McpContext } from "../../contexts/McpContext";
import { useMcpServerData } from "@/contexts/McpDataContext";
import { ServerConfig } from "@/types/server.types";

type SidebarItemColor = "primary" | "success" | "warning" | "secondary";

export function useSidebarItems() {
  const navigate = useNavigate();
  const context = useContext(McpContext);
  const state = useMcpServerData();

  if (!context) throw new Error("McpContext must be used within McpProvider");
  if (!state) return { sections: [], handleItemClick: () => {} };

  const { clients } = context;

  const handleItemClick = (href: string | undefined) => {
    if (href) navigate(href);
  };

  const getServerItems = (
    servers: Record<string, ServerConfig>,
    isCustom: boolean = false
  ): SidebarItem[] => {
    return Object.entries(servers || {}).map(([id, config]) => {
      const clientState = clients[id];
      const isConnected = clientState?.connectionStatus === "connected";

      const metadata =
        isConnected && config?.metadata
          ? {
              icon:
                config.metadata.icon ||
                state.defaults?.serverTypes?.stdio?.icon ||
                "solar:server-square-line-duotone",
              color:
                config.metadata.color ||
                state.defaults?.serverTypes?.stdio?.color ||
                "secondary",
              description:
                config.metadata.description ||
                state.defaults?.serverTypes?.stdio?.description ||
                "Local stdio-based MCP server",
            }
          : {
              icon:
                state.defaults?.unconnected?.icon ||
                "solar:server-square-line-duotone",
              color: state.defaults?.unconnected?.color || "secondary",
              description:
                state.defaults?.unconnected?.description ||
                "Disconnected server",
            };

      return {
        key: id,
        label: id,
        icon: metadata.icon,
        description: metadata.description || `${id} server`,
        href: `/servers/${id}`,
        color: (isConnected
          ? "success"
          : metadata.color || "secondary") as SidebarItemColor,
        serverId: id,
        serverType: isCustom ? "custom" : "core",
      };
    });
  };

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
  ];

  const coreServers = getServerItems(state.mcpServers);

  if (coreServers.length > 0) {
    sections.push({ title: "Core Servers", items: coreServers });
  }

  sections.push({
    title: "Logs",
    items: [
      {
        key: "settings",
        label: "Settings",
        icon: "solar:settings-line-duotone",
        description: "View logs",
        href: "/logs",
        color: "primary",
      },
    ],
  });

  sections.push({
    title: "Settings",
    items: [
      {
        key: "settings",
        label: "Settings",
        icon: "solar:settings-line-duotone",
        description: "Configure MCP settings",
        href: "/settings",
        color: "primary",
      },
    ],
  });

  sections.push({
    title: "Help",
    items: [
      {
        key: "help",
        label: "Help",
        icon: "solar:info-circle-line-duotone",
        description: "Get help with MCP",
        href: "/help",
        color: "primary",
      },
    ],
  });

  return { sections, handleItemClick };
}

export const sectionItemsWithTeams = [];
