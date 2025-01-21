import type { Request, Response } from "express";
import type { McpConfig } from "../types/index.js";
import axios from "axios";
import path from "path";

// LLMS: DO NOT CHANGE
const MCP_SERVER_URL = "http://127.0.0.1";
const TIMEOUT_MS = 5000;

export class McpHandlers {
  constructor(private config: McpConfig) {}

  /**
   * Handles GET /v1/mcp requests
   * Returns the current MCP configuration with server metadata
   */
  public async handleGetMcp(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = process.env.SYSTEMPROMPT_API_KEY;
      console.log(apiKey);
      if (!apiKey) {
        throw new Error("API key not configured");
      }

      const response = await axios.get(`${MCP_SERVER_URL}/v1/mcp`, {
        headers: {
          "api-key": apiKey,
        },
        validateStatus: (status) => status < 500,
        timeout: TIMEOUT_MS,
      });

      if (response.status === 401) {
        res.status(200).json(this.config);
        return;
      }

      // Merge remote config with local config
      const mergedConfig = {
        ...response.data,
        mcpServers: {
          ...this.config.mcpServers,
          ...Object.fromEntries(
            Object.entries(
              response.data.mcpServers as McpConfig["mcpServers"]
            ).map(([name, server]) => {
              if (name.startsWith("systemprompt-mcp-")) {
                // For backend servers, set command to node and args to the server path
                const serverPath = path.join(
                  process.cwd(),
                  "extensions",
                  name,
                  "build",
                  "index.js"
                );
                return [
                  name,
                  {
                    ...server,
                    command: "node",
                    args: [serverPath],
                  },
                ] as [string, McpConfig["mcpServers"][string]];
              }
              return [name, server] as [
                string,
                McpConfig["mcpServers"][string],
              ];
            })
          ),
        },
      } as McpConfig;

      res.status(200).json(mergedConfig);
    } catch (error) {
      console.error("Error in GET /v1/mcp:", error);
      if (
        error instanceof Error &&
        (error.message === "API key not configured" ||
          error.message === "SYSTEMPROMPT_NPX_PATH is not set")
      ) {
        throw error;
      }
      // On timeout or other errors, return local config
      res.status(200).json(this.config);
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

      // If remote server returns unauthorized, return default user config
      if (response.status === 401) {
        res.status(200).json({
          user: {
            name: "Default User",
            email: "user@example.com",
            roles: ["user"],
          },
          api_key: apiKey,
        });
        return;
      }

      res.status(200).json(response.data);
    } catch (error) {
      console.error("Error in GET /v1/user/mcp:", error);
      if (
        error instanceof Error &&
        error.message === "API key not configured"
      ) {
        throw error;
      }
      // On timeout or other errors, return default user config
      const defaultApiKey = process.env.SYSTEMPROMPT_API_KEY || "";
      res.status(200).json({
        user: {
          name: "Default User",
          email: "user@example.com",
          roles: ["user"],
        },
        api_key: defaultApiKey,
      });
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
