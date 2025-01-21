import { Request, Response } from "express";
import type { McpConfig } from "../types/index.js";

export class ConfigHandlers {
  constructor(private config: McpConfig) {}

  /**
   * Handles configuration requests
   */
  public handleConfig(req: Request, res: Response): void {
    try {
      if (!this.config?.mcpServers) {
        throw new Error("Invalid server configuration");
      }
      const config = {
        mcpServers: {
          ...this.config.mcpServers,
          ...this.config.customServers,
        },
      };
      res.status(200).json(config);
    } catch (error) {
      console.error("Error in /config route:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error:
            error instanceof Error ? error.message : "Internal server error",
        });
      }
    }
  }

  /**
   * Handles GET /v1/config/llm requests
   * Returns the LLM configuration
   */
  public async handleGetLlmConfig(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = process.env.SYSTEMPROMPT_API_KEY;
      if (!apiKey) {
        throw new Error("Systemprompt API key not found in environment");
      }

      res.status(200).json({
        provider: "gemini",
        config: {
          apiKey,
          model: "gemini-pro",
          temperature: 0.7,
          maxTokens: 100000,
        },
      });
    } catch (error) {
      console.error("Error in GET /v1/config/llm:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  /**
   * Handles GET /v1/config/agent requests
   * Returns the agent configuration
   */
  public async handleGetAgentConfig(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const apiKey = process.env.SYSTEMPROMPT_API_KEY;
      if (!apiKey) {
        throw new Error("Systemprompt API key not found in environment");
      }

      res.status(200).json({
        agents: [
          {
            name: "Default Agent",
            description: "Default system agent",
            instruction: "You are a helpful assistant.",
            knowledge: "",
            voice: "Kore",
            tools: [],
            resources: [],
            dependencies: [],
          },
        ],
      });
    } catch (error) {
      console.error("Error in GET /v1/config/agent:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }

  /**
   * Handles POST /v1/config/agent requests
   * Updates the agent configuration
   */
  public async handlePostAgentConfig(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const config = req.body;
      if (!config || !Array.isArray(config.agents)) {
        throw new Error("Invalid agent configuration format");
      }

      // Here you would typically save the configuration
      // For now, we'll just acknowledge receipt
      res.status(200).json({ status: "Configuration updated successfully" });
    } catch (error) {
      console.error("Error in POST /v1/config/agent:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Internal server error",
      });
    }
  }
}
