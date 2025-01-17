import { useState, useCallback } from "react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { McpClientState } from "../contexts/McpContext.types";
import type { ProgressNotification } from "@modelcontextprotocol/sdk/types.js";

const DEFAULT_CLIENT_STATE: McpClientState = {
  client: null,
  connectionStatus: "disconnected",
  serverType: "stdio",
  serverUrl: "",
  apiKey: "",
  resources: [],
  prompts: [],
  tools: [],
  loadedResources: [],
};

export function useMcpClient() {
  const [clients, setClients] = useState<Record<string, McpClientState>>({});

  const updateClientState = useCallback(
    (serverId: string, update: Partial<McpClientState>) => {
      setClients((prev) => ({
        ...prev,
        [serverId]: {
          ...prev[serverId],
          ...update,
        },
      }));
    },
    []
  );

  const setupClientNotifications = useCallback(
    (serverId: string, client: Client) => {
      client.fallbackNotificationHandler = async (notification: {
        method: string;
        params?: unknown;
      }) => {
        console.log("Notification received:", notification);

        if (notification.method === "notifications/progress") {
          const params = notification.params as ProgressNotification["params"];
          const clientState = clients[serverId];
          if (clientState?.onProgress) {
            const progressPercent = params.total
              ? Math.round((params.progress / params.total) * 100)
              : params.progress;
            clientState.onProgress(`Progress: ${progressPercent}%`);
          }
        }

        // ... other notification handlers ...
      };
    },
    [clients]
  );

  return {
    clients,
    activeClients: Object.entries(clients)
      .filter(([, { connectionStatus }]) => connectionStatus === "connected")
      .map(([id]) => id),
    updateClientState,
    setupClientNotifications,
    DEFAULT_CLIENT_STATE,
  };
}
