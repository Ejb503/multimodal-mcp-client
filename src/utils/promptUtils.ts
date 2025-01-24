import type {
  GetPromptRequest,
  GetPromptResult,
  ListPromptsRequest,
  ListPromptsResult,
  PromptMessage,
  TextContent,
  ImageContent,
  EmbeddedResource,
  JSONRPCError,
} from "@modelcontextprotocol/sdk/types.js";
import { JSONSchema7 } from "json-schema";

export interface McpClient {
  listPrompts: (request: ListPromptsRequest) => Promise<ListPromptsResult>;
  getPrompt: (request: GetPromptRequest) => Promise<GetPromptResult>;
}

export interface PromptExecutionOptions {
  name: string;
  args?: Record<string, string>;
}

export interface PromptDetails {
  description?: string;
  messages: PromptMessage[];
  type?: string;
  inputSchema?: JSONSchema7;
}

/**
 * Utility class for handling MCP prompt operations
 */
export class PromptUtils {
  /**
   * Lists available prompts from an MCP server
   * @param client - MCP client instance
   * @param cursor - Optional cursor for pagination
   * @returns List of available prompts with pagination info
   */
  static async listPrompts(
    client: McpClient,
    cursor?: string
  ): Promise<ListPromptsResult> {
    try {
      return await client.listPrompts({
        method: "prompts/list",
        params: cursor ? { cursor } : undefined,
      });
    } catch (error) {
      console.error("Error listing prompts:", error);
      if (error && typeof error === "object" && "error" in error) {
        const rpcError = error as JSONRPCError;
        throw new Error(`Failed to list prompts: ${rpcError.error.message}`);
      }
      throw error instanceof Error
        ? error
        : new Error(`Failed to list prompts: ${String(error)}`);
    }
  }

  /**
   * Fetches prompt details from an MCP server
   * @param client - MCP client instance
   * @param name - Name of the prompt to fetch
   * @param args - Optional arguments for the prompt
   * @returns Prompt details including messages for LLM execution
   */
  static async getPromptDetails(
    client: McpClient,
    name: string,
    args?: Record<string, string>
  ): Promise<GetPromptResult> {
    try {
      return await client.getPrompt({
        method: "prompts/get",
        params: {
          name,
          arguments: args,
        },
      });
    } catch (error) {
      console.error("Error fetching prompt details:", error);
      if (error && typeof error === "object" && "error" in error) {
        const rpcError = error as JSONRPCError;
        throw new Error(
          `Failed to fetch prompt details for ${name}: ${rpcError.error.message}`
        );
      }
      throw error instanceof Error
        ? error
        : new Error(
            `Failed to fetch prompt details for ${name}: ${String(error)}`
          );
    }
  }

  /**
   * Prepares messages for LLM execution from prompt details
   * @param promptDetails - The prompt details from getPromptDetails
   * @returns Array of messages ready for LLM execution
   */
  static prepareMessagesForLlm(
    promptDetails: GetPromptResult
  ): PromptMessage[] {
    return promptDetails.messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));
  }

  /**
   * Helper method to check if a message content is text
   */
  static isTextContent(
    content: TextContent | ImageContent | EmbeddedResource
  ): content is TextContent {
    return content.type === "text";
  }

  /**
   * Helper method to check if a message content is an image
   */
  static isImageContent(
    content: TextContent | ImageContent | EmbeddedResource
  ): content is ImageContent {
    return content.type === "image";
  }

  /**
   * Helper method to check if a message content is an embedded resource
   */
  static isEmbeddedResource(
    content: TextContent | ImageContent | EmbeddedResource
  ): content is EmbeddedResource {
    return content.type === "resource";
  }

  /**
   * Helper method to extract text content from a message
   */
  static getTextContent(message: PromptMessage): string | undefined {
    if (this.isTextContent(message.content)) {
      return message.content.text;
    }
    return undefined;
  }

  /**
   * Helper method to extract image content from a message
   */
  static getImageContent(
    message: PromptMessage
  ): { data: string; mimeType: string } | undefined {
    if (this.isImageContent(message.content)) {
      return {
        data: message.content.data,
        mimeType: message.content.mimeType,
      };
    }
    return undefined;
  }
}
