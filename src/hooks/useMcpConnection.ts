import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  CreateMessageRequestSchema,
  CreateMessageRequest,
  CreateMessageResult,
} from "@modelcontextprotocol/sdk/types.js";
import type {
  McpClientState,
  ServerMetadata,
  ServerCapabilities,
} from "../contexts/McpContext.types";
import { getServerConfig } from "../../config/server.config";

interface ServerInfo {
  name?: unknown;
  version?: unknown;
  protocolVersion?: unknown;
  metadata?: unknown;
}

export function useMcpConnection(
  updateClientState: (
    serverId: string,
    updates: Partial<McpClientState>
  ) => void,
  setupClientNotifications: (client: Client, serverId: string) => void,
  onPendingRequest: (
    request: CreateMessageRequest["params"],
    resolve: (result: CreateMessageResult) => void,
    reject: (error: Error) => void
  ) => void
) {
  const connectServer = async (serverId: string) => {
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

      client.onclose = () => {
        updateClientState(serverId, {
          connectionStatus: "disconnected",
          client: null,
        });
      };

      setupClientNotifications(client, serverId);

      client.setRequestHandler(CreateMessageRequestSchema, (request) => {
        return new Promise((resolve, reject) => {
          onPendingRequest(request.params, resolve, reject);
        });
      });

      const proxyUrl = new URL("http://localhost:3000/sse");
      proxyUrl.searchParams.append("transportType", "stdio");
      proxyUrl.searchParams.append("serverId", serverId);
      const transport = new SSEClientTransport(proxyUrl);
      transport.onmessage = (e) => console.log(e);

      await client.connect(transport);

      // Get server info and capabilities
      const serverInfo = client.getServerVersion() as ServerInfo;
      if (!serverInfo || typeof serverInfo !== "object") {
        throw new Error("Failed to get server info");
      }
      const capabilities = client.getServerCapabilities() as ServerCapabilities;
      console.log(capabilities);

      // Fetch available tools, prompts, and resources
      let tools: McpClientState["tools"] = [];
      let prompts: McpClientState["prompts"] = [];
      let resources: McpClientState["resources"] = [];

      if (capabilities && typeof capabilities === "object") {
        if ("tools" in capabilities) {
          const result = await client.listTools();
          tools = result.tools;
        }
        if ("prompts" in capabilities) {
          const result = await client.listPrompts();
          prompts = result.prompts;
        }
        if ("resources" in capabilities) {
          const result = await client.listResources();
          resources = result.resources;
        }
      }

      // Get server config with metadata
      const metadata = serverInfo.metadata as ServerMetadata | undefined;
      const serverConfig = getServerConfig(serverId, metadata, true);

      updateClientState(serverId, {
        client,
        connectionStatus: "connected",
        serverType: "stdio",
        tools,
        prompts,
        resources,
        serverInfo: {
          name: String(serverInfo.name || ""),
          version: String(serverInfo.version || ""),
          protocolVersion: String(serverInfo.protocolVersion || ""),
          capabilities,
          metadata,
        },
        serverConfig,
      });
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
