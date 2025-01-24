import path from "path";
import fs from "fs/promises";
import ora from "ora";
import chalk from "chalk";
import {
  McpConfig,
  ServerConfig,
  BackendServerConfig,
} from "../types/index.js";
import { MCP_SERVER_URL } from "../handlers/mcpHandlers.js";

// Required environment variables
const REQUIRED_ENV_VARS = [
  "SYSTEMPROMPT_API_KEY",
  // Add any other required env vars here
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

const printSection = (title: string) => {
  console.log("\n" + chalk.bold.cyan(`━━━ ${title} ━━━`));
};

/**
 * Validates that all required environment variables are present
 * @returns Promise that resolves when all env vars are validated
 */
export async function validateEnvironmentVariables(): Promise<void> {
  printSection("Environment Variables");

  const spinner = ora({
    text: "Checking required environment variables...",
    color: "cyan",
  }).start();

  const missingVars: RequiredEnvVar[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      missingVars.push(envVar);
    }
  }

  if (missingVars.length > 0) {
    spinner.warn("Missing required environment variables");
    console.log(
      chalk.yellow(
        "\nThe following environment variables are required but missing:"
      )
    );
    missingVars.forEach((v) => console.log(chalk.yellow(`- ${v}`)));
    console.log(
      chalk.gray(
        "\nPlease add them to your .env file or set them in your environment."
      )
    );

    // Only throw if SYSTEMPROMPT_API_KEY is missing since it's critical
    if (missingVars.includes("SYSTEMPROMPT_API_KEY")) {
      throw new Error("Critical environment variables are missing");
    }
  } else {
    spinner.succeed("All required environment variables are present");
  }
}

/**
 * Verifies and loads the Systemprompt API key
 * @returns Promise that resolves to the API key
 */
export async function loadApiKey(): Promise<string> {
  const spinner = ora("Verifying API key").start();
  const apiKeyName = "SYSTEMPROMPT_API_KEY";
  const envPath = path.resolve(process.cwd(), ".env");

  // Check if API key exists in process.env
  if (!process.env[apiKeyName]) {
    spinner.fail("API key not found in environment");
    throw new Error("SYSTEMPROMPT_API_KEY is not set");
  }

  // Verify the API key exists in the .env file, not just process.env
  try {
    const envContent = await fs.readFile(envPath, "utf8");
    if (!envContent?.includes(`${apiKeyName}=`)) {
      spinner.fail("API key not found in .env file");
      throw new Error(
        "API key exists in process.env but not in .env file. Please add it to your .env file."
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      // Create .env file if it doesn't exist
      await fs.writeFile(envPath, `${apiKeyName}=${process.env[apiKeyName]}\n`);
    } else {
      spinner.fail("Failed to verify API key in .env file");
      throw error;
    }
  }

  spinner.succeed("API key verified");
  return process.env[apiKeyName];
}

/**
 * Loads and verifies the server configuration
 * @returns Promise that resolves when config is verified
 */
export async function loadServerConfig(): Promise<McpConfig> {
  printSection("Server Configuration");

  const spinner = ora({
    text: "Loading server configuration...",
    color: "cyan",
  }).start();

  try {
    // First check which extensions are actually available
    const extensionsDir = path.join(process.cwd(), "extensions");
    let availableExtensions: Set<string>;
    try {
      const entries = await fs.readdir(extensionsDir, { withFileTypes: true });
      availableExtensions = new Set(
        entries
          .filter(
            (entry) =>
              entry.isDirectory() && entry.name.startsWith("systemprompt-mcp-")
          )
          .map((entry) => entry.name)
      );
    } catch {
      spinner.warn("Could not read extensions directory");
      availableExtensions = new Set();
    }

    // First try to load servers from the backend
    spinner.start("Loading servers from backend...");
    let backendServers: Record<string, BackendServerConfig> = {};
    try {
      const apiKey = await loadApiKey();
      console.log("DEBUG: Using API key for backend request:", apiKey);
      const response = await fetch(`${MCP_SERVER_URL}/v1/mcp`, {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        backendServers = data.mcpServers || {};
        Object.keys(backendServers).forEach((name) => {
          if (!availableExtensions.has(name)) {
            console.log(chalk.yellow("\n⚠️  Missing required extension:"));
            console.log(
              chalk.yellow(
                `   Server "${name}" is available but extension is not installed`
              )
            );
            console.log(
              chalk.gray("   Please install the extension and try again")
            );
          }
        });
      }
    } catch (error) {
      spinner.info(`Could not load servers from backend: ${error}`);
    }

    // Try to load custom servers from file
    spinner.start("Loading custom server configurations...");
    try {
      const customConfigPath = path.join("config", "mcp.config.custom.json");
      const customConfigStr = await fs.readFile(customConfigPath, "utf-8");
      const customConfig = JSON.parse(customConfigStr);

      type ServerConfigInput = {
        command: string;
        args: string[];
        env?: string[] | Record<string, string>;
        metadata?: {
          icon?: string;
          description?: string;
        };
        agent?: unknown[];
        id?: string;
      };

      // Type guard for ServerConfig
      function isServerConfig(value: unknown): value is ServerConfigInput {
        if (typeof value !== "object" || value === null) return false;

        const candidate = value as {
          command?: unknown;
          args?: unknown;
          id?: unknown;
        };

        return (
          typeof candidate.command === "string" &&
          Array.isArray(candidate.args) &&
          (candidate.id === undefined || typeof candidate.id === "string")
        );
      }

      // Collect all server configurations
      const allCustomServers = {
        // Get servers from mcpServers object
        ...(customConfig.mcpServers || {}),
        // Get any root-level server configurations
        ...Object.fromEntries(
          Object.entries(customConfig).filter(
            ([key, value]) => key !== "mcpServers" && isServerConfig(value)
          )
        ),
      } as Record<string, ServerConfigInput>;

      // Check for any servers that require extensions
      Object.entries(allCustomServers).forEach(([name, server]) => {
        const args = server.args?.[0] || "";
        // If the server path includes /extensions/systemprompt-mcp-*, check if it exists
        const match = args.match(
          /[/\\]extensions[/\\](systemprompt-mcp-[^/\\]+)/
        );
        if (match) {
          const extensionName = match[1];
          if (!availableExtensions.has(extensionName)) {
            console.log(chalk.yellow("\n⚠️  Missing required extension:"));
            console.log(
              chalk.yellow(
                `   Server "${name}" requires extension "${extensionName}"`
              )
            );
            console.log(
              chalk.gray("   Please install the extension and try again")
            );
          }
        }
      });

      const processedBackendServers = Object.fromEntries(
        Object.entries(backendServers).map(([name, server]) => {
          const serverPath = path.resolve(
            process.cwd(),
            path.normalize(path.join("extensions", name, "build", "index.js"))
          );

          // Get API keys from the backend server config
          const apiKeys = Object.fromEntries(
            (server.env || []).map((key) => {
              return [key, process.env[key] || ""];
            })
          );

          spinner.succeed(`Found backend server: ${name}`);
          // Create a deep copy of the server config to avoid reference issues
          const serverConfig = {
            id: name, // Use name as ID for backend servers
            env: apiKeys,
            metadata: server.metadata ? { ...server.metadata } : undefined,
            agent: server.agent ? [...server.agent] : undefined,
            // Always use node with the server path for backend servers
            command: "node",
            args: [serverPath],
          } satisfies ServerConfig;

          // Always use node directly with the server path
          return [name, serverConfig];
        })
      );

      // Process each custom server
      const processedCustomServers = Object.fromEntries(
        Object.entries(allCustomServers).map(([name, server]) => {
          if (!server.command || server.command.trim() === "") {
            spinner.fail(`Invalid server configuration for ${name}`);
            throw new Error(`Server "${name}" has no command specified`);
          }

          // Convert environment variables to proper format
          const envVars = Array.isArray(server.env)
            ? server.env.reduce((acc: Record<string, string>, key: string) => {
                if (process.env[key]) {
                  acc[key] = process.env[key] as string;
                }
                return acc;
              }, {})
            : server.env || {};

          const serverEnv = {
            ...envVars,
            SYSTEMPROMPT_API_KEY: process.env.SYSTEMPROMPT_API_KEY || "",
          };
          spinner.succeed(`Found custom server: ${name}`);
          return [
            name,
            {
              ...server,
              id: name, // Use server name as ID for custom servers
              command: server.command,
              args: server.args.map((arg) =>
                path.resolve(process.cwd(), path.normalize(arg))
              ),
              env: serverEnv,
            },
          ] as [string, McpConfig["mcpServers"][string]];
        })
      );

      // Save the final configuration
      const finalConfig = {
        mcpServers: {
          ...processedCustomServers,
          ...processedBackendServers,
        },
        available: {},
        agents: [],
      };
      // Save the processed config back to mcp.config.json
      const configPath = path.join("config", "mcp.config.json");
      const configWithWarning = {
        _warning: "This file is automatically generated. DO NOT EDIT DIRECTLY.",
        ...finalConfig,
      };
      await fs.writeFile(
        configPath,
        JSON.stringify(configWithWarning, null, 2)
      );

      JSON.parse(await fs.readFile(configPath, "utf-8"));

      spinner.succeed("Loaded and saved server configurations");
      return finalConfig;
    } catch (error) {
      spinner.fail(`Failed to load server configurations: ${error}`);
      throw error;
    }
  } catch (error) {
    spinner.fail("Failed to load configuration");
    console.error(chalk.red("Error loading server config:"), error);
    throw error;
  }
}

/**
 * Loads and verifies the user configuration
 * @returns Promise that resolves when config is verified
 */
export async function loadUserConfig(apiKey: string): Promise<McpConfig> {
  printSection("User Configuration");

  const spinner = ora({
    text: "Loading user configuration...",
    color: "cyan",
  }).start();

  try {
    const response = await fetch(`${MCP_SERVER_URL}/v1/user/mcp`, {
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      spinner.fail("Failed to load user configuration");
      throw new Error(`Failed to load config: ${response.statusText}`);
    }

    const config = (await response.json()) as McpConfig;
    spinner.succeed("User configuration loaded");
    return config;
  } catch (error) {
    spinner.fail("Failed to load configuration");
    console.error(chalk.red("Error loading user config:"), error);
    throw error;
  }
}
