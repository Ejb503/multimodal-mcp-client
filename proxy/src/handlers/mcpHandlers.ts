import type { Request, Response } from "express";
import type { McpConfig } from "../types/index.js";
import axios from "axios";
import path from "path";
import type { McpServiceResponse } from "../types/index.js";

// LLMS: DO NOT CHANGE
const MCP_SERVER_URL = "https://api.systemprompt.io";
const TIMEOUT_MS = 5000;

export class McpHandlers {
  constructor(private config: McpConfig) {
    this.config = config;
  }

  private mapServiceResponseToConfig(response: McpServiceResponse): McpConfig {
    if (!response?.available) {
      throw new Error("MCP Service response missing available modules");
    }

    // Map available modules to mcpServers format for executable servers
    const mcpServers = Object.entries(response.available).reduce(
      (acc, [name, moduleInfo]) => {
        if (name.startsWith("systemprompt-mcp-")) {
          // For backend servers, set command to node and args to the server path
          const serverPath = path.join(
            process.cwd(),
            "extensions",
            name,
            "build",
            "index.js"
          );

          acc[name] = {
            id: moduleInfo.id,
            type: moduleInfo.type,
            title: moduleInfo.title,
            description: moduleInfo.description,
            environment: moduleInfo.environment_variables,
            command: "node",
            args: [serverPath],
            metadata: {
              created: moduleInfo.metadata.created,
              updated: moduleInfo.metadata.updated,
              version: moduleInfo.metadata.version,
              status: moduleInfo.metadata.status,
            },
          };
        }
        return acc;
      },
      {} as McpConfig["mcpServers"]
    );

    // Return config with API-provided available modules and merged servers
    return {
      ...this.config,
      mcpServers: {
        ...this.config.mcpServers, // Keep custom servers
        ...mcpServers, // Add executable MCP servers
      },
      available: response.available, // Always use API-provided modules
    };
  }

  /**
   * Handles GET /v1/mcp requests
   * Returns the current MCP configuration with server metadata
   */
  public async handleGetMcp(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = process.env.SYSTEMPROMPT_API_KEY;
      if (!apiKey) {
        throw new Error("API key not configured");
      }

      const response = await axios.get<McpServiceResponse>(
        `${MCP_SERVER_URL}/v1/mcp`,
        {
          headers: {
            "api-key": apiKey,
          },
          validateStatus: (status) => status < 500,
          timeout: TIMEOUT_MS,
        }
      );

      // Validate response data
      if (!response.data) {
        throw new Error("Invalid response from MCP service");
      }

      // Map the service response to our config format
      const mergedConfig = this.mapServiceResponseToConfig(response.data);

      // Log the merged config for debugging
      console.debug("MCP config:", {
        mcpServersCount: Object.keys(mergedConfig.mcpServers).length,
        availableModulesCount: Object.keys(mergedConfig.available).length,
      });

      res.status(200).json(mergedConfig);
    } catch (error) {
      console.error("Error in GET /v1/mcp:", error);

      // Always throw API errors since we need the available modules
      throw error;
    }
  }

  /**
   * Handles GET /v1/user/mcp requests
   * Returns user-specific MCP configuration
   */
  public async handleGetUserMcp(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = process.env.SYSTEMPROMPT_API_KEY;
      if (!apiKey) {
        throw new Error("API key not configured");
      }

      const response = await axios.get(`${MCP_SERVER_URL}/v1/user/mcp`, {
        headers: {
          "api-key": apiKey,
        },
        validateStatus: (status) => status < 500,
        timeout: TIMEOUT_MS,
      });

      res.status(200).json(response.data);
    } catch (error) {
      console.error("Error in GET /v1/user/mcp:", error);
      if (
        error instanceof Error &&
        error.message === "API key not configured"
      ) {
        throw error;
      }
      res
        .status(500)
        .json({ error: "Internal server error, GetUserMcp failed" });
    }
  }

  /**
   * Handles POST /v1/config/mcp requests
   * Updates the MCP configuration
   */
  public async handlePostConfigMcp(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = process.env.SYSTEMPROMPT_API_KEY;
      console.log(apiKey);
      if (!apiKey) {
        throw new Error("API key not configured");
      }

      const response = await axios.post(
        `${MCP_SERVER_URL}/v1/config/mcp`,
        req.body,
        {
          headers: {
            "api-key": apiKey,
            "Content-Type": "application/json",
          },
          validateStatus: (status) => status < 500,
          timeout: TIMEOUT_MS,
        }
      );

      // Update local config
      this.config.mcpServers = {
        ...this.config.mcpServers,
        ...req.body.mcpServers,
      };
      this.config.customServers = {
        ...(this.config.customServers || {}),
        ...(req.body.customServers || {}),
      };

      // If remote server returns unauthorized, acknowledge local update
      if (response.status === 401) {
        res.status(200).json({
          status: "Configuration updated locally",
          _warning: "Remote update failed - unauthorized",
          mcpServers: this.config.mcpServers,
          customServers: this.config.customServers || {},
        });
        return;
      }

      // On success, return only the API response
      res.status(200).json(response.data);
    } catch (error) {
      console.error("Error in POST /v1/config/mcp:", error);
      if (
        error instanceof Error &&
        error.message === "API key not configured"
      ) {
        throw error;
      }
      // On timeout or other errors, acknowledge local update
      res.status(200).json({
        status: "Configuration updated locally",
        _warning:
          "Remote update failed - " +
          (error instanceof Error ? error.message : "unknown error"),
        mcpServers: {
          ...this.config.mcpServers,
          ...req.body.mcpServers,
        },
        customServers: req.body.customServers || {},
      });
    }
  }
}
