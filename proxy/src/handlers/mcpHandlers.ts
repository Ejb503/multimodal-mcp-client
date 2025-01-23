import type { Request, Response } from "express";
import axios from "axios";
import type {
  McpServiceResponse,
  McpConfig,
  McpAgent,
} from "../types/index.js";

// LLMS: DO NOT CHANGE
export const MCP_SERVER_URL = "https://api.systemprompt.io";
const TIMEOUT_MS = 5000;

export class McpHandlers {
  constructor(private config: McpConfig) {
    this.config = config;
  }

  private mapServiceResponseToConfig(response: McpServiceResponse): McpConfig {
    if (!response?.available) {
      throw new Error("MCP Service response missing available modules");
    }

    // Create a Set of installed module IDs for faster lookup
    const installedModules = new Set(
      response.installed.map((module) => module.name)
    );

    const mcpServers = Object.entries(response.available).reduce(
      (acc, [name, moduleInfo]) => {
        if (installedModules.has(name)) {
          // Get the platform-specific command
          const command = process.platform === "win32" ? "npx.cmd" : "npx";

          // Create environment record
          const envRecord = (moduleInfo.environment_variables || []).reduce(
            (env, key) => ({
              ...env,
              [key]: process.env[key] || "",
            }),
            {}
          );

          acc[name] = {
            command,
            args: [name], // Use the package name directly with npx
            env: envRecord,
            metadata: {
              icon: moduleInfo.icon,
              description: moduleInfo.description,
              title: moduleInfo.title,
              type: moduleInfo.type,
            },
            agent: moduleInfo.agent,
          };
        }
        return acc;
      },
      {} as McpConfig["mcpServers"]
    );

    console.log("Merging Servers", mcpServers);

    this.config.mcpServers = {
      ...this.config.mcpServers,
      ...mcpServers,
    };
    this.config.available = response.available;

    const allAgents: McpAgent[] = Object.values(response.available).reduce(
      (agents, moduleInfo) => {
        if (moduleInfo.agent && moduleInfo.agent.length > 0) {
          return [...agents, ...moduleInfo.agent];
        }
        return agents;
      },
      [] as McpAgent[]
    );

    return {
      ...this.config,
      mcpServers: this.config.mcpServers,
      available: response.available,
      agents: allAgents,
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

      if (!response.data) {
        throw new Error("Invalid response from MCP service");
      }

      const mergedConfig = this.mapServiceResponseToConfig(response.data);

      res.status(200).json(mergedConfig);
    } catch (error) {
      console.error("Error in GET /v1/mcp:", error);
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

      // If remote server returns unauthorized, acknowledge local update
      if (response.status === 401) {
        res.status(200).json({
          status: "Configuration updated locally",
          _warning: "Remote update failed - unauthorized",
          mcpServers: this.config.mcpServers,
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
      });
    }
  }

  /**
   * Handles POST /v1/mcp/install requests
   * Installs a new MCP server
   */
  public async handleInstallMcp(req: Request, res: Response): Promise<void> {
    try {
      const { serverId } = req.body;
      if (!serverId) {
        throw new Error("Server ID is required");
      }

      // Get the server info from available servers
      const serverInfo = this.config.available[serverId];
      if (!serverInfo) {
        throw new Error(`Server ${serverId} not found in available servers`);
      }

      // Create the server configuration with npx command
      const command = process.platform === "win32" ? "npx.cmd" : "npx";
      const serverConfig = {
        command,
        args: ["-y", serverId],
        env: {
          SYSTEMPROMPT_API_KEY: process.env.SYSTEMPROMPT_API_KEY || "",
        },
        metadata: {
          icon: serverInfo.icon,
          description: serverInfo.description,
          title: serverInfo.title,
          type: serverInfo.type,
        },
      };

      // Update the configuration
      this.config.mcpServers = {
        ...this.config.mcpServers,
        [serverId]: serverConfig,
      };

      // Return the updated configuration
      res.status(200).json({
        status: "Server installed successfully",
        mcpServers: this.config.mcpServers,
      });
    } catch (error) {
      console.error("Error in POST /v1/mcp/install:", error);
      if (error instanceof Error) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  }
}
