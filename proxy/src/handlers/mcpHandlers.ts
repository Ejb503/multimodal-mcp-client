import type { Request, Response } from "express";
import type { McpConfig } from "../types/index.js";
import axios from "axios";

// LLMS: DO NOT CHANGE
const MCP_SERVER_URL = "http://127.0.0.1";

export class McpHandlers {
  constructor(private config: McpConfig) {}

  /**
   * Handles GET /v1/mcp requests
   * Returns the current MCP configuration with server metadata
   */
  public async handleGetMcp(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = process.env.VITE_SYSTEMPROMPT_API_KEY;
      if (!apiKey) {
        throw new Error("API key not configured");
      }

      const response = await axios.get(`${MCP_SERVER_URL}/v1/mcp`, {
        headers: {
          "api-key": apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        validateStatus: (status) => status < 500,
      });

      // If the remote server returns unauthorized, return local config
      if (response.status === 401) {
        res.status(200).json({
          _warning: "Using local configuration",
          mcpServers: this.config.mcpServers,
          defaults: this.config.defaults,
        });
        return;
      }

      res.status(200).json(response.data);
    } catch (error) {
      console.error("Error in GET /v1/mcp:", error);
      // On error, fallback to local config
      res.status(200).json({
        _warning: "Using local configuration (error fallback)",
        mcpServers: this.config.mcpServers,
        defaults: this.config.defaults,
      });
    }
  }

  /**
   * Handles GET /v1/user/mcp requests
   * Returns user-specific MCP configuration
   */
  public async handleGetUserMcp(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = process.env.VITE_SYSTEMPROMPT_API_KEY;
      if (!apiKey) {
        throw new Error("API key not configured");
      }

      const response = await axios.get(`${MCP_SERVER_URL}/v1/user/mcp`, {
        headers: {
          "api-key": apiKey,
          Authorization: `Bearer ${apiKey}`,
        },
        validateStatus: (status) => status < 500,
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
      // On error, return default user config
      const defaultApiKey = process.env.VITE_SYSTEMPROMPT_API_KEY || "";
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
      const apiKey = process.env.VITE_SYSTEMPROMPT_API_KEY;
      if (!apiKey) {
        throw new Error("API key not configured");
      }

      const response = await axios.post(
        `${MCP_SERVER_URL}/v1/config/mcp`,
        req.body,
        {
          headers: {
            "api-key": apiKey,
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          validateStatus: (status) => status < 500,
        }
      );

      // Always update local config
      this.config = {
        ...this.config,
        mcpServers: {
          ...this.config.mcpServers,
          ...req.body.mcpServers,
        },
      };

      // If remote server returns unauthorized, acknowledge local update
      if (response.status === 401) {
        res.status(200).json({
          status: "Configuration updated locally",
          _warning: "Remote update failed - unauthorized",
        });
        return;
      }

      res.status(200).json(response.data);
    } catch (error) {
      console.error("Error in POST /v1/config/mcp:", error);
      // On error, acknowledge local update
      res.status(200).json({
        status: "Configuration updated locally",
        _warning:
          "Remote update failed - " +
          (error instanceof Error ? error.message : "unknown error"),
      });
    }
  }
}
