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
      console.log("Debug - Updating client state:", {
        serverId,
        timestamp: new Date().toISOString(),
        currentState: clients[serverId],
        update: {
          hasClient: Boolean(update.client),
          connectionStatus: update.connectionStatus,
          toolCount: update.tools?.length,
        },
      });

      setClients((prev) => {
        const newState = {
          ...prev,
          [serverId]: {
            ...prev[serverId],
            ...update,
          },
        };

        console.log("Debug - Client state updated:", {
          serverId,
          timestamp: new Date().toISOString(),
          newState: {
            hasClient: Boolean(newState[serverId]?.client),
            connectionStatus: newState[serverId]?.connectionStatus,
            toolCount: newState[serverId]?.tools?.length,
          },
        });

        return newState;
      });
    },
    [clients]
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
