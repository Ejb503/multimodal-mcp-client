import { useState, useCallback } from "react";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { McpClientState } from "../contexts/McpContext.types";
import type { ProgressNotification } from "@modelcontextprotocol/sdk/types.js";

export const DEFAULT_CLIENT_STATE: McpClientState = {
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
        currentState: clients[serverId] || DEFAULT_CLIENT_STATE,
        update: {
          hasClient: Boolean(update.client),
          connectionStatus: update.connectionStatus,
          toolCount: update.tools?.length,
        },
      });

      setClients((prev) => {
        const currentState = prev[serverId] || DEFAULT_CLIENT_STATE;
        const newState = {
          ...prev,
          [serverId]: {
            ...currentState,
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
          const clientState = clients[serverId] || DEFAULT_CLIENT_STATE;
          if (clientState?.onProgress) {
            const progressPercent = params.total
              ? Math.round((params.progress / params.total) * 100)
              : params.progress;
            clientState.onProgress(`Progress: ${progressPercent}%`);
          }
        }
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
