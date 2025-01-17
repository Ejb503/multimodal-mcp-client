import { useState, useMemo } from "react";
import { useMcp } from "@/contexts/McpContext";
import type { ServerCapabilities } from "@/contexts/McpContext.types";
import { Resource, Tool } from "@modelcontextprotocol/sdk/types.js";

interface Prompt {
  name: string;
  description?: string;
  type?: string;
  messages?: Array<{
    role: string;
    content: {
      type: string;
      text: string;
    };
  }>;
  inputSchema?: {
    type: "object";
    properties?: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
  _meta?: {
    prompt?: {
      id?: string;
      instruction?: {
        static: string;
        dynamic: string;
        state: string;
      };
      input?: {
        name: string;
        description: string;
        schema: {
          type: string;
          required?: string[];
          properties?: Record<string, { type: string; description?: string }>;
          description?: string;
          additionalProperties?: boolean;
        };
        type: string[];
        reference: unknown[];
      };
      output?: {
        name: string;
        description: string;
        schema: {
          type: string;
          required?: string[];
          properties?: Record<string, { type: string; description?: string }>;
          description?: string;
          additionalProperties?: boolean;
        };
      };
      metadata?: {
        title: string;
        description: string;
        created: string;
        updated: string;
        version: number;
        status: string;
        tag: string[];
      };
    };
  };
}

interface UseServerOptions {
  /** Callback for handling connection errors */
  onError?: (error: Error) => void;
  /** The server ID to connect to */
  serverId: string;
}

interface McpPromptResponse {
  name?: string;
  description?: string;
  type?: string;
  arguments?: Array<{
    name: string;
    type: string;
    description?: string;
    required?: boolean;
  }>;
  messages?: Array<{
    role: string;
    content: {
      type: string;
      text: string;
    };
  }>;
  _meta?: {
    prompt?: {
      id?: string;
      instruction?: {
        static: string;
        dynamic: string;
        state: string;
      };
      input?: {
        name: string;
        description: string;
        schema: {
          type: string;
          required?: string[];
          properties?: Record<string, { type: string; description?: string }>;
          description?: string;
          additionalProperties?: boolean;
        };
        type: string[];
        reference: unknown[];
      };
      output?: {
        name: string;
        description: string;
        schema: {
          type: string;
          required?: string[];
          properties?: Record<string, { type: string; description?: string }>;
          description?: string;
          additionalProperties?: boolean;
        };
      };
      metadata?: {
        title: string;
        description: string;
        created: string;
        updated: string;
        version: number;
        status: string;
        tag: string[];
      };
    };
  };
}

export interface ServerState {
  isConnected: boolean;
  isConnecting: boolean;
  hasError: boolean;
  error: Error | null;
  tools: Tool[];
  prompts: Prompt[];
  resources: Resource[];
  hasListToolsCapability: boolean;
  hasListPromptsCapability: boolean;
  hasListResourcesCapability: boolean;
  serverInfo?: {
    name: string;
    version: string;
    protocolVersion: string;
    capabilities: ServerCapabilities;
  };
}

export interface ServerActions {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  fetchTools: () => Promise<void>;
  executeTool: (
    toolName: string,
    params: Record<string, unknown>
  ) => Promise<unknown>;
  fetchPrompts: () => Promise<void>;
  selectPrompt: (promptName: string) => Promise<void>;
  getPromptDetails: (
    promptName: string,
    args?: Record<string, string>
  ) => Promise<Prompt>;
  executePrompt: (
    promptName: string,
    params: Record<string, unknown>
  ) => Promise<unknown>;
  fetchResources: () => Promise<void>;
  readResource: (resourceUri: string) => Promise<unknown>;
}

export function useServer({ onError, serverId }: UseServerOptions): {
  state: ServerState;
  actions: ServerActions;
} {
  const {
    clients,
    connectServer,
    disconnectServer,
    listTools,
    executeTool,
    listPrompts,
    selectPrompt,
    listResources,
    executePrompt,
    readResource,
  } = useMcp();
  const [error, setError] = useState<Error | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const clientState = clients[serverId];

  const state: ServerState = {
    isConnected: clientState?.connectionStatus === "connected",
    isConnecting: isConnecting || clientState?.connectionStatus === "pending",
    hasError: clientState?.connectionStatus === "error" || error !== null,
    error,
    tools: clientState?.tools || [],
    prompts: useMemo(() => {
      const rawPrompts = (clientState?.prompts || []) as McpPromptResponse[];
      return rawPrompts.map((p) => {
        // Create input schema from arguments array
        const properties: Record<
          string,
          { type: string; description?: string }
        > = {};
        const required: string[] = [];

        if (Array.isArray(p.arguments)) {
          p.arguments.forEach(
            (arg: {
              name: string;
              type: string;
              description?: string;
              required?: boolean;
            }) => {
              properties[arg.name] = {
                type: arg.type,
                description: arg.description,
              };
              if (arg.required) {
                required.push(arg.name);
              }
            }
          );
        }

        return {
          name: p.name || "",
          description: p.description,
          type: p.type,
          inputSchema:
            Object.keys(properties).length > 0
              ? {
                  type: "object",
                  properties,
                  required,
                }
              : undefined,
        };
      });
    }, [clientState?.prompts]),
    resources: clientState?.resources || [],
    hasListToolsCapability: Boolean(
      clientState?.serverInfo?.capabilities?.tools
    ),
    hasListPromptsCapability: Boolean(
      clientState?.serverInfo?.capabilities?.prompts
    ),
    hasListResourcesCapability: Boolean(
      clientState?.serverInfo?.capabilities?.resources
    ),
    serverInfo: clientState?.serverInfo,
  };

  const actions: ServerActions = {
    connect: async () => {
      try {
        setIsConnecting(true);
        setError(null);
        await connectServer(serverId);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        onError?.(err);
      } finally {
        setIsConnecting(false);
      }
    },
    disconnect: async () => {
      try {
        await disconnectServer(serverId);
        setError(null);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        onError?.(err);
      }
    },
    fetchTools: async () => {
      if (!state.hasListToolsCapability) return;
      try {
        await listTools(serverId);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        onError?.(err);
      }
    },
    executeTool: async (toolName: string, params: Record<string, unknown>) => {
      try {
        return await executeTool(serverId, { name: toolName, args: params });
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        onError?.(err);
        throw err;
      }
    },
    fetchPrompts: async () => {
      if (!state.hasListPromptsCapability) return;
      try {
        await listPrompts(serverId);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        onError?.(err);
      }
    },
    selectPrompt: async (promptName: string) => {
      try {
        await selectPrompt(serverId, promptName);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        onError?.(err);
      }
    },
    getPromptDetails: async (
      promptName: string,
      args?: Record<string, string>
    ) => {
      try {
        const clientState = clients[serverId];
        if (!clientState?.client) {
          throw new Error("No MCP client available");
        }

        // Get the raw prompt first to get the arguments structure
        const rawPrompt = clientState.prompts?.find(
          (p) => p.name === promptName
        ) as McpPromptResponse;
        if (!rawPrompt) {
          throw new Error("Prompt not found");
        }

        // Create input schema from arguments array
        const properties: Record<
          string,
          { type: string; description?: string }
        > = {};
        const required: string[] = [];

        if (Array.isArray(rawPrompt.arguments)) {
          rawPrompt.arguments.forEach((arg) => {
            properties[arg.name] = {
              type: arg.type,
              description: arg.description,
            };
            if (arg.required) {
              required.push(arg.name);
            }
          });
        }

        // If no args provided, return the prompt with just the schema
        if (!args) {
          return {
            name: promptName,
            description: rawPrompt.description,
            type:
              typeof rawPrompt.type === "string" ? rawPrompt.type : undefined,
            inputSchema:
              Object.keys(properties).length > 0
                ? {
                    type: "object",
                    properties,
                    required,
                  }
                : undefined,
            _meta: rawPrompt._meta,
          };
        }

        const result = (await clientState.client.getPrompt({
          name: promptName,
          arguments: args,
        })) as McpPromptResponse;

        const promptDetails: Prompt = {
          name: promptName,
          description: result.description,
          type: typeof result.type === "string" ? result.type : undefined,
          inputSchema:
            Object.keys(properties).length > 0
              ? {
                  type: "object",
                  properties,
                  required,
                }
              : undefined,
          messages: result.messages,
          _meta: result._meta,
        };

        return promptDetails;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error("Error getting prompt details:", err);
        onError?.(err);
        throw err;
      }
    },
    executePrompt: async (
      promptName: string,
      params: Record<string, unknown>
    ) => {
      try {
        const result = await executePrompt(serverId, {
          name: promptName,
          args: params,
        });
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        console.error("Prompt execution error:", err);
        onError?.(err);
        throw err;
      }
    },
    fetchResources: async () => {
      if (!state.hasListResourcesCapability) return;
      try {
        await listResources(serverId);
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        onError?.(err);
      }
    },
    readResource: async (resourceUri: string) => {
      try {
        const result = await readResource(serverId, resourceUri);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        onError?.(err);
        throw err;
      }
    },
  };

  return { state, actions };
}
