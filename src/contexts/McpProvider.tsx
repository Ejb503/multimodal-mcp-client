/**
 * This file contains the implementation of the MCP Provider.
 * It manages the connection state and operations for all MCP servers.
 *
 * @see McpContext.tsx for the context definition
 * @see McpContext.types.ts for type definitions
 */
import type { z } from "zod";
import { McpContext } from "./McpContext";
import { useMcpClient } from "../hooks/useMcpClient";
import { useState, useRef } from "react";
import { useMcpConnection } from "../hooks/useMcpConnection";
import { SamplingModal } from "../components/Modal/SamplingModal";
import {
  CallToolResultSchema,
  CreateMessageRequest,
  CreateMessageResult,
  CreateMessageRequestSchema,
  CreateMessageResultSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createSamplingError } from "../hooks/useMcpSampling.types";
import type { PendingSampleRequest } from "../hooks/useMcpSampling.types";

type ToolCall = z.infer<typeof CallToolResultSchema>;

export function McpProvider({ children }: { children: React.ReactNode }) {
  const {
    clients,
    activeClients,
    updateClientState,
    setupClientNotifications,
  } = useMcpClient();

  const [pendingSampleRequests, setPendingSampleRequests] = useState<
    PendingSampleRequest[]
  >([]);
  const nextRequestId = useRef(0);

  const requestSampling = async (
    serverId: string,
    request: CreateMessageRequest["params"],
    progress?: (status: string) => void
  ): Promise<CreateMessageResult> => {
    const progressToken = nextRequestId.current;

    if (!clients[serverId]?.client) {
      throw createSamplingError(
        `No client available for server ${serverId}`,
        "NO_CLIENT"
      );
    }

    const requestWithProgress: CreateMessageRequest["params"] = {
      ...request,
      _meta: {
        ...request._meta,
        progressToken,
      },
    };

    return new Promise((resolve, reject) => {
      setPendingSampleRequests((prev) => [
        ...prev,
        {
          id: nextRequestId.current++,
          serverId,
          request: requestWithProgress,
          resolve,
          reject,
          progress,
        },
      ]);
    });
  };

  const handleApproveSampling = async (
    requestId: number,
    response?: CreateMessageResult
  ) => {
    console.log("Debug - Handling sampling approval:", {
      requestId,
      timestamp: new Date().toISOString(),
      hasResponse: Boolean(response),
    });

    const request = pendingSampleRequests.find((r) => r.id === requestId);
    if (!request) {
      console.log("Debug - No pending request found:", { requestId });
      return;
    }

    const { serverId, request: messageRequest, resolve, reject } = request;

    setPendingSampleRequests((prev) => prev.filter((r) => r.id !== requestId));

    if (response) {
      console.log("Debug - Using provided response:", {
        requestId,
        timestamp: new Date().toISOString(),
      });
      resolve(response);
      return;
    }

    const clientState = clients[serverId];
    console.log("Debug - Checking client for message creation:", {
      serverId,
      timestamp: new Date().toISOString(),
      hasClient: Boolean(clientState?.client),
      connectionStatus: clientState?.connectionStatus,
    });

    if (!clientState?.client) {
      console.log("Debug - No client available for message creation:", {
        serverId,
        timestamp: new Date().toISOString(),
      });
      reject(createSamplingError("Client not available", "NO_CLIENT"));
      return;
    }

    try {
      console.log("Debug - Creating message:", {
        serverId,
        timestamp: new Date().toISOString(),
        request: messageRequest,
      });

      const result = await clientState.client.request(
        {
          method: "sampling/createMessage",
          params: messageRequest,
        },
        CreateMessageResultSchema
      );

      console.log("Debug - Message created successfully:", {
        serverId,
        timestamp: new Date().toISOString(),
        result,
      });

      resolve(result);
    } catch (error) {
      console.error("Debug - Error creating message:", {
        serverId,
        timestamp: new Date().toISOString(),
        error,
        clientState: {
          hasClient: Boolean(clientState?.client),
          connectionStatus: clientState?.connectionStatus,
        },
      });
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleRejectSampling = (requestId: number) => {
    const request = pendingSampleRequests.find((r) => r.id === requestId);
    if (!request) return;

    setPendingSampleRequests((prev) => prev.filter((r) => r.id !== requestId));

    request.reject(
      createSamplingError("User rejected sampling", "USER_REJECTED")
    );
  };

  const { connectServer, disconnectServer } = useMcpConnection(
    updateClientState,
    (request, resolve, reject, serverId) => {
      console.log("Debug - Handling sampling request from server:", {
        serverId,
        timestamp: new Date().toISOString(),
        request,
      });

      // Add the request to pending requests for user approval
      setPendingSampleRequests((prev) => [
        ...prev,
        {
          id: nextRequestId.current++,
          serverId,
          request,
          resolve,
          reject,
          progress: undefined,
        },
      ]);
    }
  );

  const selectPrompt = async (serverId: string, promptId: string) => {
    const clientState = clients[serverId];
    if (!clientState?.client) return;

    const result = await clientState.client.getPrompt({
      name: promptId,
      arguments: {
        message: "Initializing MCP Prompt",
      },
    });

    interface PromptMeta {
      _meta?: {
        prompt?: {
          instruction?: {
            static?: boolean;
          };
        };
      };
    }

    if (!result || !(result as PromptMeta)._meta?.prompt?.instruction?.static) {
      console.error("Couldn't get prompt");
      return;
    }

    updateClientState(serverId, {
      selectedPrompt: result,
    });
  };

  const listResources = async (serverId: string) => {
    const clientState = clients[serverId];
    if (!clientState?.client) return;
    const result = await clientState.client.listResources();
    updateClientState(serverId, {
      resources: result.resources,
    });
  };

  const listPrompts = async (serverId: string) => {
    const clientState = clients[serverId];
    if (!clientState?.client) return;
    const result = await clientState.client.listPrompts();
    updateClientState(serverId, {
      prompts: result.prompts,
    });
  };

  const listTools = async (serverId: string) => {
    const clientState = clients[serverId];
    if (!clientState?.client) return;
    const result = await clientState.client.listTools();
    updateClientState(serverId, {
      tools: result.tools,
    });
  };

  const executeTool = async (
    serverId: string,
    params: { name: string; args: Record<string, unknown> }
  ) => {
    console.log("Debug - Tool execution started:", {
      serverId,
      timestamp: new Date().toISOString(),
      toolName: params.name,
      clientsAvailable: Object.keys(clients),
    });

    const clientState = clients[serverId];
    console.log("Debug - Tool execution client state:", {
      serverId,
      timestamp: new Date().toISOString(),
      hasClient: Boolean(clientState?.client),
      connectionStatus: clientState?.connectionStatus,
      toolCount: clientState?.tools?.length,
    });

    if (!clientState?.client) {
      console.log("Debug - No client available for tool execution:", {
        serverId,
        timestamp: new Date().toISOString(),
        availableClients: Object.keys(clients).map((id) => ({
          id,
          hasClient: Boolean(clients[id]?.client),
          status: clients[id]?.connectionStatus,
        })),
      });
      throw new Error("No MCP client available");
    }

    try {
      console.log("Debug - Calling tool:", {
        serverId,
        timestamp: new Date().toISOString(),
        toolName: params.name,
        args: params.args,
      });

      const response = await clientState.client.callTool(
        {
          name: params.name,
          arguments: params.args,
        },
        CallToolResultSchema
      );

      console.log("Debug - Tool execution successful:", {
        serverId,
        timestamp: new Date().toISOString(),
        toolName: params.name,
      });

      return response as ToolCall;
    } catch (error) {
      console.error("Debug - Error in executeTool:", {
        serverId,
        timestamp: new Date().toISOString(),
        error,
        clientState: {
          hasClient: Boolean(clientState?.client),
          connectionStatus: clientState?.connectionStatus,
        },
      });
      throw error;
    }
  };

  const executePrompt = async (
    serverId: string,
    params: { name: string; args: Record<string, unknown> }
  ) => {
    const clientState = clients[serverId];
    if (!clientState?.client) {
      throw new Error("No MCP client available");
    }
    try {
      const response = await clientState.client.getPrompt({
        name: params.name,
        arguments: Object.fromEntries(
          Object.entries(params.args).map(([key, value]) => [
            key,
            String(value),
          ])
        ),
      });
      return response;
    } catch (error) {
      console.error("Error in executePrompt:", error);
      throw error;
    }
  };

  const readResource = async (serverId: string, resourceName: string) => {
    const clientState = clients[serverId];
    if (!clientState?.client) {
      throw new Error("No MCP client available");
    }
    try {
      const response = await clientState.client.readResource({
        uri: resourceName,
      });
      return response;
    } catch (error) {
      console.error("Error in readResource:", error);
      throw error;
    }
  };

  return (
    <McpContext.Provider
      value={{
        clients,
        activeClients,
        connectServer,
        disconnectServer: (serverId: string) =>
          disconnectServer(serverId, clients[serverId]?.client),
        selectPrompt,
        listResources,
        listPrompts,
        listTools,
        executeTool,
        executePrompt,
        readResource,
        requestSampling,
        pendingSampleRequests,
        handleApproveSampling,
        handleRejectSampling,
      }}
    >
      <div data-testid="mcp-provider">
        {children}

        {pendingSampleRequests.map((request) => (
          <SamplingModal
            key={request.id}
            isOpen={true}
            onClose={() => handleRejectSampling(request.id)}
            request={request.request}
            onApprove={(response) =>
              handleApproveSampling(request.id, response)
            }
            onReject={() => handleRejectSampling(request.id)}
          />
        ))}
      </div>
    </McpContext.Provider>
  );
}
