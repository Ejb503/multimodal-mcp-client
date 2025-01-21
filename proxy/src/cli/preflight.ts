import chalk from "chalk";
import ora from "ora";
import fs from "fs/promises";
import path from "path";
import { input } from "@inquirer/prompts";
import {
  McpConfig,
  ServerConfig,
  BackendServerConfig,
} from "../types/index.js";

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
  printSection("API Key Verification");

  const envPath = ".env";
  const apiKeyName = "SYSTEMPROMPT_API_KEY";

  const spinner = ora({
    text: "Checking for Systemprompt API key...",
    color: "cyan",
  }).start();

  if (!process.env[apiKeyName]) {
    spinner.info("API key not found in environment");

    const apiKey = await input({
      message: "Please enter your Systemprompt API key:",
    });

    try {
      let envContent = "";
      try {
        envContent = await fs.readFile(envPath, "utf8");
      } catch {
        // File doesn't exist, start with empty content
      }

      const apiKeyLine = `${apiKeyName}=${apiKey}`;
      if (envContent.includes(apiKeyName)) {
        envContent = envContent.replace(
          new RegExp(`${apiKeyName}=.*`),
          apiKeyLine
        );
      } else {
        envContent = envContent ? `${envContent}\n${apiKeyLine}` : apiKeyLine;
      }

      await fs.writeFile(envPath, envContent);
      process.env[apiKeyName] = apiKey;
      spinner.succeed("API key verified and saved");
      return apiKey;
    } catch (error) {
      spinner.fail("Failed to save API key");
      console.error(chalk.red("Error saving API key:"), error);
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
      const response = await fetch("http://127.0.0.1/v1/mcp", {
        headers: {
          "api-key": process.env.SYSTEMPROMPT_API_KEY || "",
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        backendServers = data.mcpServers || {};
        console.log(
          "Raw backend server data:",
          JSON.stringify(data.mcpServers, null, 2)
        );
        console.log(
          "Raw backend server commands:",
          Object.entries(data.mcpServers || {}).map(([name, server]) => ({
            name,
            env: (server as BackendServerConfig).env,
            metadata: (server as BackendServerConfig).metadata,
            agent: (server as BackendServerConfig).agent,
          }))
        );

        // Check each backend server for its extension
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
      };

      // Type guard for ServerConfig
      function isServerConfig(value: unknown): value is ServerConfigInput {
        if (typeof value !== "object" || value === null) return false;

        const candidate = value as {
          command?: unknown;
          args?: unknown;
        };

        return (
          typeof candidate.command === "string" && Array.isArray(candidate.args)
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

      // Convert backend servers to local configurations
      const processedBackendServers = Object.fromEntries(
        Object.entries(backendServers).map(([name, server]) => {
          const serverPath = path.resolve(
            process.cwd(),
            path.normalize(path.join("extensions", name, "build", "index.js"))
          );

          // Get API keys from the backend server config
          const apiKeys = Object.fromEntries(
            (server.env || []).map((key) => [key, process.env[key] || ""])
          );

          spinner.succeed(`Found backend server: ${name}`);
          console.log(`Backend server ${name} config:`, {
            env: server.env,
            metadata: server.metadata,
            agent: server.agent,
            final: {
              command: "node",
              args: [serverPath],
            },
          });

          // Create a deep copy of the server config to avoid reference issues
          const serverConfig = {
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
          console.log(`Custom server ${name} env:`, server.env);
          console.log(`Custom server ${name} serverEnv:`, serverEnv);

          spinner.succeed(`Found custom server: ${name}`);
          console.log(`Custom server ${name} command:`, {
            command: server.command,
            args: server.args.map((arg) =>
              path.resolve(process.cwd(), path.normalize(arg))
            ),
          });

          return [
            name,
            {
              ...server,
              command: server.command,
              args: server.args.map((arg) =>
                path.resolve(process.cwd(), path.normalize(arg))
              ),
              env: serverEnv,
            },
          ] as [string, McpConfig["mcpServers"][string]];
        })
      );

      // Merge both sets of servers
      const finalConfig: McpConfig = {
        mcpServers: {
          ...processedCustomServers, // Custom servers first (lower priority)
          ...processedBackendServers, // Backend servers override (higher priority)
        },
      };

      console.log(
        "Final server configs:",
        JSON.stringify(finalConfig.mcpServers, null, 2)
      );

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

      // Verify the saved config
      const savedConfig = JSON.parse(await fs.readFile(configPath, "utf-8"));
      console.log(
        "Verifying saved config - backend server commands:",
        Object.entries(savedConfig.mcpServers)
          .filter(([name]) => name.startsWith("systemprompt-mcp-"))
          .map(([name, server]) => ({
            name,
            command: (server as ServerConfig).command,
            args: (server as ServerConfig).args,
          }))
      );

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
    const response = await fetch("http://127.0.0.1/v1/user/mcp", {
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
