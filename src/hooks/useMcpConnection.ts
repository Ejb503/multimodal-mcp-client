import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  CreateMessageRequestSchema,
  CreateMessageRequest,
  CreateMessageResult,
  ServerCapabilities,
  Implementation,
} from "@modelcontextprotocol/sdk/types.js";
import type { McpClientState } from "../types/McpContext.types";
import type { ServerMetadata } from "../types/server.types";
import { getServerConfig } from "../../config/server.config";
import { useMcpData } from "@/contexts/McpDataContext";

export function useMcpConnection(
  updateClientState: (
    serverId: string,
    updates: Partial<McpClientState>
  ) => void,
  onPendingRequest: (
    request: CreateMessageRequest["params"],
    resolve: (result: CreateMessageResult) => void,
    reject: (error: Error) => void,
    serverId: string
  ) => void,
  bootstrapServer: (
    serverId: string,
    client: Client,
    capabilities: ServerCapabilities
  ) => Promise<void>
) {
  const { state } = useMcpData();

  const connectServer = async (serverId: string) => {
    if (state.status === "loading") {
      throw new Error("MCP data is still loading");
    }

    if (state.status === "error") {
      throw new Error(`Failed to load MCP data: ${state.error.message}`);
    }

    const mcpData = state.mcpData;

    // Find server config by name
    const serverConfig = mcpData.mcpServers[serverId];

    if (!serverConfig) {
      throw new Error(`Server ${serverId} not found in MCP configuration`);
    }

    try {
      const client = new Client(
        {
          name: `mcp-client-${serverId}`,
          version: "0.0.1",
        },
        {
          capabilities: {
            tools: {
              listTools: true,
            },
            prompts: {
              listPrompts: true,
            },
            resources: {
              listResources: true,
            },
            sampling: {},
            logging: {},
          },
        }
      );

      // Debug client lifecycle events
      client.onclose = () => {
        updateClientState(serverId, {
          connectionStatus: "disconnected",
          client: null,
        });
      };

      client.onerror = (error) => {
        console.log("Debug - Client error event:", {
          serverId,
          timestamp: new Date().toISOString(),
          error: error,
        });
      };

      // First establish the connection
      const proxyUrl = new URL("http://localhost:3000/sse");
      proxyUrl.searchParams.append("transportType", "stdio");
      proxyUrl.searchParams.append("serverId", serverId);
      const transport = new SSEClientTransport(proxyUrl);

      // Set up request handler before connecting
      client.setRequestHandler(CreateMessageRequestSchema, async (request) => {
        return new Promise((resolve, reject) => {
          onPendingRequest(request.params, resolve, reject, serverId);
        });
      });
      await client.connect(transport);

      // Set up reconnection handler
      transport.onclose = async () => {
        try {
          await client.connect(transport);
        } catch (error) {
          console.error("Debug - Reconnection failed:", {
            serverId,
            timestamp: new Date().toISOString(),
            error,
          });
          updateClientState(serverId, {
            connectionStatus: "error",
            client: null,
          });
        }
      };

      // Get basic server info only
      try {
        const serverInfo = client.getServerVersion() as Implementation;
        if (!serverInfo || typeof serverInfo !== "object") {
          throw new Error("Failed to get server info");
        }

        const capabilities =
          client.getServerCapabilities() as ServerCapabilities;
        const metadata = serverInfo.metadata as ServerMetadata | undefined;
        const serverConfig = getServerConfig(serverId, mcpData, metadata, true);

        // Update state with connection and basic info only
        updateClientState(serverId, {
          client,
          connectionStatus: "connected",
          serverType: "stdio",
          agents: [],
          tools: [],
          prompts: [],
          resources: [],
          serverInfo: {
            name: String(serverInfo.name || ""),
            version: String(serverInfo.version || ""),
            protocolVersion: String(serverInfo.protocolVersion || ""),
            capabilities,
            metadata,
          },
          serverConfig,
        });

        // Bootstrap the server with direct access to client and capabilities
        await bootstrapServer(serverId, client, capabilities);
      } catch (error) {
        console.error("Debug - Connection verification failed:", {
          serverId,
          timestamp: new Date().toISOString(),
          error,
        });

        try {
          await client.close();
        } catch (closeError) {
          console.error("Debug - Error closing failed connection:", {
            serverId,
            timestamp: new Date().toISOString(),
            error: closeError,
          });
        }

        updateClientState(serverId, {
          client: null,
          connectionStatus: "error",
        });

        throw new Error(
          `Failed to verify connection: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    } catch (e) {
      console.error("Connection error:", e);
      updateClientState(serverId, {
        client: null,
        connectionStatus: "error",
      });
      throw e;
    }
  };

  const disconnectServer = async (serverId: string, client: Client | null) => {
    if (!client) return;

    try {
      await client.close();
      updateClientState(serverId, {
        client: null,
        connectionStatus: "disconnected",
      });
    } catch (e) {
      console.error("Disconnection error:", e);
      throw e;
    }
  };

  return {
    connectServer,
    disconnectServer,
  };
}
