import type { Request, Response } from "express";
import axios, { AxiosRequestConfig, AxiosError } from "axios";
import type {
  McpServiceResponse,
  McpConfig,
  McpAgent,
} from "../types/index.js";

// LLMS: DO NOT CHANGE
export const MCP_SERVER_URL = "https://api.systemprompt.io";
const TIMEOUT_MS = 5000;

class McpError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public originalError?: Error
  ) {
    super(message);
    this.name = "McpError";
  }
}

export class McpHandlers {
  constructor(private config: McpConfig) {
    this.config = config;
  }

  private getAxiosConfig(
    additionalConfig: Partial<AxiosRequestConfig> = {}
  ): AxiosRequestConfig {
    const apiKey = process.env.SYSTEMPROMPT_API_KEY;
    if (!apiKey) {
      throw new McpError("API key not configured", 401);
    }

    return {
      headers: {
        "api-key": apiKey,
      },
      validateStatus: (status: number) => status < 500,
      timeout: TIMEOUT_MS,
      ...additionalConfig,
    };
  }

  private async makeRequest<T>(
    method: "get" | "post" | "delete",
    endpoint: string,
    config: AxiosRequestConfig = {}
  ): Promise<T> {
    try {
      const axiosConfig = this.getAxiosConfig(config);
      const url = `${MCP_SERVER_URL}${endpoint}`;

      let response;
      switch (method) {
        case "get":
          response = await axios.get<T>(url, axiosConfig);
          break;
        case "post":
          response = await axios.post<T>(url, config.data, axiosConfig);
          break;
        case "delete":
          response = await axios.delete<T>(url, axiosConfig);
          break;
      }

      if (!response.data) {
        throw new McpError("Invalid response from MCP service");
      }

      return response.data;
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message: string }>;
        throw new McpError(
          axiosError.response?.data?.message || axiosError.message,
          axiosError.response?.status || 500,
          error
        );
      }
      throw new McpError("Unexpected error occurred", 500, error as Error);
    }
  }

  private mapServiceResponseToConfig(response: McpServiceResponse): McpConfig {
    if (!response?.available) {
      throw new McpError("MCP Service response missing available modules");
    }

    // Create a Map of installed module IDs for faster lookup
    const installedModules = new Map(
      response.installed.map((module) => [module.name, module.id])
    );

    // Start with an empty mcpServers object
    const mcpServers: McpConfig["mcpServers"] = {};

    // Add installed servers from the response
    Object.entries(response.available).forEach(([name, moduleInfo]) => {
      // Only add if it's in installed modules
      if (installedModules.has(name)) {
        // Get the platform-specific command
        const command = process.platform === "win32" ? "npx.cmd" : "npx";

        // Create environment record
        const envRecord = (moduleInfo.environment_variables || []).reduce(
          (env, key) => ({
            ...env,
            [key]: process.env[key] || process.env[`VITE_${key}`] || "",
          }),
          {}
        );

        // Get the ID from installed modules
        const id = installedModules.get(name);
        if (!id) {
          throw new McpError(`No ID found for installed module ${name}`);
        }

        // Store server by name but preserve the UUID
        mcpServers[moduleInfo.title] = {
          id, // Backend UUID for core servers
          command,
          args: [moduleInfo.title],
          env: envRecord,
          metadata: {
            icon: moduleInfo.icon,
            description: moduleInfo.description,
            title: moduleInfo.title,
            type: moduleInfo.type,
            serverType: "core", // Mark as core server
          },
          agent: moduleInfo.agent,
        };
      }
    });

    // Add custom servers (not in available) from existing config
    Object.entries(this.config.mcpServers).forEach(([name, server]) => {
      if (!(name in response.available)) {
        mcpServers[name] = {
          ...server,
          metadata: {
            ...server.metadata,
            serverType: "custom",
          },
        };
      }
    });

    const allAgents: McpAgent[] = Object.entries(response.available).reduce(
      (agents, [moduleName, moduleInfo]) => {
        // Only include agents from installed modules
        if (
          moduleInfo.agent &&
          moduleInfo.agent.length > 0 &&
          installedModules.has(moduleName)
        ) {
          return [...agents, ...moduleInfo.agent];
        }
        return agents;
      },
      [] as McpAgent[]
    );

    // Add custom agents from config
    Object.entries(this.config.customAgents || {}).forEach(
      ([id, agentInfo]) => {
        allAgents.push({
          id,
          type: "custom",
          content: agentInfo.instruction,
          metadata: {
            title: agentInfo.name,
            description: agentInfo.description,
            tag: [],
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            version: 1,
            status: "active",
          },
          _link: "",
        });
      }
    );

    return {
      ...this.config,
      mcpServers,
      available: response.available,
      agents: allAgents,
    };
  }

  private handleError(res: Response, error: unknown) {
    console.error("MCP Handler Error:", error);
    if (error instanceof McpError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal server error" });
    }
  }

  public async handleGetMcp(_: Request, res: Response): Promise<McpConfig> {
    try {
      const response = await this.makeRequest<McpServiceResponse>(
        "get",
        "/v1/mcp"
      );
      const mergedConfig = this.mapServiceResponseToConfig(response);
      // Update local config
      this.config = mergedConfig;
      res.status(200).json(mergedConfig);
      return mergedConfig;
    } catch (error) {
      this.handleError(res, error);
      throw error;
    }
  }

  public async handleGetUserMcp(_: Request, res: Response): Promise<void> {
    try {
      const response = await this.makeRequest<McpServiceResponse>(
        "get",
        "/v1/user/mcp"
      );
      res.status(200).json(response);
    } catch (error) {
      this.handleError(res, error);
    }
  }

  public async handleInstallMcp(req: Request, res: Response): Promise<void> {
    try {
      const { moduleId } = req.body;
      if (!moduleId) {
        throw new McpError("ModuleId is required", 400);
      }

      // First get the current config to find the UUID
      const currentConfig = await this.makeRequest<McpServiceResponse>(
        "get",
        "/v1/mcp"
      );

      // Find the module name from the UUID
      const moduleName = Object.entries(currentConfig.available).find(
        ([, info]) => info.id === moduleId
      )?.[0];

      if (!moduleName) {
        throw new McpError(`No module found with ID ${moduleId}`, 400);
      }

      // Install the module using its UUID
      await this.makeRequest("post", `/v1/mcp/${moduleId}`, {
        data: { moduleId },
      });

      // Fetch and update config
      const response = await this.makeRequest<McpServiceResponse>(
        "get",
        "/v1/mcp"
      );
      const updatedConfig = this.mapServiceResponseToConfig(response);

      // Return the full updated configuration
      res.status(200).json({
        status: "Server installed successfully",
        ...updatedConfig,
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  public async handleUninstallMcp(req: Request, res: Response): Promise<void> {
    try {
      const { moduleId } = req.body;
      if (!moduleId) {
        throw new McpError("ModuleId is required", 400);
      }

      // Find the server with this UUID in mcpServers
      const serverEntry = Object.entries(this.config.mcpServers).find(
        ([, server]) => server.id === moduleId
      );
      if (!serverEntry) {
        throw new McpError(`No server found with ID ${moduleId}`, 400);
      }

      const [, server] = serverEntry;
      if (server.metadata?.serverType !== "core") {
        throw new McpError("Only core servers can be uninstalled", 400);
      }

      // Uninstall the module using its UUID
      await this.makeRequest("delete", `/v1/mcp/${moduleId}`);

      // Fetch and update config
      const response = await this.makeRequest<McpServiceResponse>(
        "get",
        "/v1/mcp"
      );
      const updatedConfig = this.mapServiceResponseToConfig(response);

      // Return the full updated configuration
      res.status(200).json({
        status: "Server uninstalled successfully",
        ...updatedConfig,
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }
}
