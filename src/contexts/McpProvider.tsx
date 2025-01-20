/**
 * This file contains the implementation of the MCP Provider.
 * It manages the connection state and operations for all MCP servers.
 *
 * @see McpContext.tsx for the context definition
 * @see McpContext.types.ts for type definitions
 */
import { McpContext } from "./McpContext";
import { useMcpClient } from "../hooks/useMcpClient";
import { useState, useRef } from "react";
import { useMcpConnection } from "../hooks/useMcpConnection";
import { SamplingModal } from "../components/Modal/SamplingModal";
import {
  CallToolResultSchema,
  CreateMessageRequest,
  CreateMessageResult,
  CreateMessageResultSchema,
  CallToolResult,
  Prompt,
  PromptMessage,
} from "@modelcontextprotocol/sdk/types.js";
import { createSamplingError } from "../hooks/useMcpSampling.types";
import type { PendingSampleRequest } from "../hooks/useMcpSampling.types";
import type { z } from "zod";
import { Component, ErrorInfo } from "react";

class McpErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("MCP Provider Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-600">
          <h2>Something went wrong in the MCP Provider.</h2>
          <pre className="mt-2 text-sm">
            {this.state.error?.message || "Unknown error"}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

export function McpProvider({ children }: { children: React.ReactNode }) {
  return (
    <McpErrorBoundary>
      <McpProviderInner>{children}</McpProviderInner>
    </McpErrorBoundary>
  );
}

function McpProviderInner({ children }: { children: React.ReactNode }) {
  const { clients, activeClients, updateClientState } = useMcpClient();

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
    const request = pendingSampleRequests.find((r) => r.id === requestId);
    if (!request) {
      console.log("Debug - No pending request found:", { requestId });
      return;
    }

    const { serverId, request: messageRequest, resolve, reject } = request;

    setPendingSampleRequests((prev) => prev.filter((r) => r.id !== requestId));

    if (response) {
      resolve(response);
      return;
    }

    const clientState = clients[serverId];

    if (!clientState?.client) {
      reject(createSamplingError("Client not available", "NO_CLIENT"));
      return;
    }

    try {
      const result = await clientState.client.request(
        {
          method: "sampling/createMessage",
          params: messageRequest,
        },
        CreateMessageResultSchema
      );

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
  ): Promise<CallToolResult> => {
    const clientState = clients[serverId];
    if (!clientState?.client) {
      throw new Error("No MCP client available");
    }

    try {
      const response = (await clientState.client.callTool(
        {
          name: params.name,
          arguments: params.args,
        },
        CallToolResultSchema
      )) as z.infer<typeof CallToolResultSchema>;
      return response;
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

      return {
        name: params.name,
        description: response.description,
        arguments: response.arguments,
        messages: response.messages,
        _meta: response._meta,
      } as Prompt & {
        messages: PromptMessage[];
        _meta?: {
          responseSchema?: Record<string, unknown>;
        };
      };
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
            serverId={request.serverId}
          />
        ))}
      </div>
    </McpContext.Provider>
  );
}
