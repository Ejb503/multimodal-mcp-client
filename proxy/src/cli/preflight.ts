import chalk from "chalk";
import ora from "ora";
import { findActualExecutable } from "spawn-rx";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs/promises";
import { input } from "@inquirer/prompts";
import { resolve } from "node:path";
import { spawn } from "child_process";
import { McpConfig } from "../types/index.js";

// Required environment variables
const REQUIRED_ENV_VARS = [
  "SYSTEMPROMPT_API_KEY",
  "SYSTEMPROMPT_NPX_PATH",
  "SYSTEMPROMPT_NPX_ARGS",
  // Add any other required env vars here
] as const;

type RequiredEnvVar = (typeof REQUIRED_ENV_VARS)[number];

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

interface ConfigData {
  mcpServers: Record<
    string,
    {
      command?: string;
      args?: string[];
      [key: string]: unknown;
    }
  >;
  [key: string]: unknown;
}

const printSection = (title: string) => {
  console.log("\n" + chalk.bold.cyan(`━━━ ${title} ━━━`));
};
// Handle process signals
const setupProcessHandlers = () => {
  process.on("SIGINT", () => {
    console.log(chalk.yellow("\nGracefully shutting down..."));
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log(chalk.yellow("\nGracefully shutting down..."));
    process.exit(0);
  });
};

/**
 * Tests if npx is available and working
 * @returns Promise that resolves to the npx executable path when confirmed working
 */
export async function checkNpxAvailability(): Promise<{
  cmd: string;
  args: string[];
}> {
  printSection("Checking NPX Installation");

  const spinner = ora({
    text: "Verifying npx is available...",
    color: "cyan",
  }).start();

  try {
    const execInfo = findActualExecutable("npx", ["--version"]);
    const transport = new StdioClientTransport({
      command: execInfo.cmd,
      args: execInfo.args,
      env: process.env as Record<string, string>,
      stderr: "pipe",
    });

    await transport.start();
    await transport.close?.();

    // Save NPX info to .env
    const envPath = ".env";
    let envContent = "";
    try {
      envContent = await fs.readFile(envPath, "utf8");
    } catch {
      // File doesn't exist, start with empty content
    }

    // Update or add NPX path
    const npxPathLine = `SYSTEMPROMPT_NPX_PATH=${execInfo.cmd}`;
    const npxArgsLine = `SYSTEMPROMPT_NPX_ARGS=${JSON.stringify(execInfo.args)}`;

    if (envContent.includes("SYSTEMPROMPT_NPX_PATH")) {
      envContent = envContent.replace(
        new RegExp(`SYSTEMPROMPT_NPX_PATH=.*`),
        npxPathLine
      );
    } else {
      envContent = envContent ? `${envContent}\n${npxPathLine}` : npxPathLine;
    }

    if (envContent.includes("SYSTEMPROMPT_NPX_ARGS")) {
      envContent = envContent.replace(
        new RegExp(`SYSTEMPROMPT_NPX_ARGS=.*`),
        npxArgsLine
      );
    } else {
      envContent = `${envContent}\n${npxArgsLine}`;
    }

    await fs.writeFile(envPath, envContent);
    process.env.SYSTEMPROMPT_NPX_PATH = execInfo.cmd;
    process.env.SYSTEMPROMPT_NPX_ARGS = JSON.stringify(execInfo.args);

    spinner.succeed("npx is available and working");
    return execInfo;
  } catch (error) {
    spinner.fail("npx check failed");
    console.error(chalk.red("Error checking npx:"), error);
    throw new Error("npx is not available. Please install Node.js and npm.");
  }
}

/**
 * Verifies if MCP server package can be installed and run
 * @returns Promise that resolves when verification is successful
 */
export async function verifyMcpPackage(npxInfo: {
  cmd: string;
  args: string[];
}): Promise<void> {
  printSection("Verifying MCP Package");

  const spinner = ora({
    text: "Checking if MCP server package is accessible...",
    color: "cyan",
  }).start();

  try {
    // Create environment with API key
    const env = { ...process.env } as Record<string, string>;
    if (!env.SYSTEMPROMPT_API_KEY) {
      env.SYSTEMPROMPT_API_KEY = await loadApiKey();
    }

    const transport = new StdioClientTransport({
      command: npxInfo.cmd,
      args: [
        ...npxInfo.args.slice(0, -1),
        "-y",
        "systemprompt-agent-server",
        "--version",
      ],
      env,
      stderr: "pipe",
    });

    await transport.start();
    await transport.close?.();

    spinner.succeed("MCP server package is accessible");
  } catch (error) {
    spinner.fail("MCP server package check failed");
    console.error(chalk.red("Error verifying MCP server package:"), error);
    throw new Error(
      "Cannot access MCP server package. Please check your internet connection and npm configuration."
    );
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
export async function loadServerConfig(apiKey: string): Promise<McpConfig> {
  printSection("Server Configuration");

  const spinner = ora({
    text: "Loading server configuration...",
    color: "cyan",
  }).start();

  try {
    // Load contrib servers from API
    const response = await fetch("http://127.0.0.1/v1/mcp", {
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      spinner.fail("Failed to load server configuration");
      throw new Error(`Failed to load config: ${response.statusText}`);
    }

    const contribConfig = (await response.json()) as McpConfig;
    if (!contribConfig.mcpServers) {
      spinner.fail("Invalid server configuration");
      throw new Error("Server configuration is missing mcpServers");
    }

    // Set command and args from environment for contrib servers
    const npxPath = process.env.SYSTEMPROMPT_NPX_PATH;
    const npxArgs = process.env.SYSTEMPROMPT_NPX_ARGS
      ? JSON.parse(process.env.SYSTEMPROMPT_NPX_ARGS)
      : [];

    if (!npxPath) {
      spinner.fail("NPX path not found in environment");
      throw new Error("SYSTEMPROMPT_NPX_PATH is not set");
    }

    // Create a new config object with the merged settings
    const mergedContribConfig = {
      ...contribConfig,
      mcpServers: Object.fromEntries(
        Object.entries(contribConfig.mcpServers).map(([name, server]) => {
          if (name.startsWith("systemprompt-mcp-")) {
            // For contrib servers, we want to run: cmd.exe /C npx.cmd package-name
            // So we take the first two parts of npxArgs (/C and npx.cmd path)
            const baseNpxArgs = npxArgs.slice(0, 2);
            return [
              name,
              {
                ...server,
                command: npxPath,
                args: [...baseNpxArgs, name],
              },
            ] as [string, McpConfig["mcpServers"][string]];
          }
          return [name, server] as [string, McpConfig["mcpServers"][string]];
        })
      ),
    } as McpConfig;

    // Debug log the contrib servers
    console.log(chalk.gray("\nContrib servers loaded from API:"));
    Object.entries(mergedContribConfig.mcpServers).forEach(([name, server]) => {
      console.log(chalk.gray(`  ✓ ${name}:`));
      console.log(chalk.gray(`    command: ${server.command || "undefined"}`));
      console.log(chalk.gray(`    args: ${JSON.stringify(server.args || [])}`));
      if (server.env && Array.isArray(server.env)) {
        console.log(chalk.gray(`    environment:`));
        server.env.forEach((envVar: string) => {
          const isSet = process.env[envVar] !== undefined;
          console.log(chalk.gray(`      ${isSet ? "✓" : "✗"} ${envVar}`));
        });
      }
    });

    spinner.succeed("Loaded contrib servers");

    // Try to load custom servers from file
    spinner.start("Adding custom servers...");
    try {
      const customConfigStr = await fs.readFile(
        "config/mcp.config.custom.json",
        "utf-8"
      );
      const customConfig = JSON.parse(customConfigStr) as McpConfig;

      // Validate custom config
      if (!customConfig.mcpServers) {
        throw new Error("Custom configuration is missing mcpServers");
      }

      // Only show servers that start with "custom-" prefix
      const customServers = Object.entries(customConfig.mcpServers).filter(
        ([name]) => name.startsWith("custom-")
      );

      // Validate each custom server has a command
      customServers.forEach(([name, server]) => {
        if (!server.command || server.command.trim() === "") {
          spinner.fail(`Invalid server configuration for ${name}`);
          throw new Error(`Server "${name}" has no command specified`);
        }
      });

      // Merge custom servers with contrib servers
      const finalConfig = {
        mcpServers: {
          ...mergedContribConfig.mcpServers,
          ...customConfig.mcpServers,
        },
      };

      spinner.succeed("Added custom servers");

      // Print the custom servers that were added
      if (customServers.length > 0) {
        console.log(
          chalk.gray(`Added ${customServers.length} custom server(s):`)
        );
        customServers.forEach(([name, server]) => {
          console.log(
            chalk.gray(
              `  ✓ ${name} - ${server.metadata?.description || "No description"}`
            )
          );
          if (server.env && Array.isArray(server.env)) {
            console.log(chalk.gray(`    environment:`));
            server.env.forEach((envVar) => {
              const isSet = process.env[envVar] !== undefined;
              console.log(chalk.gray(`      ${isSet ? "✓" : "✗"} ${envVar}`));
            });
          }
        });
      }

      return finalConfig;
    } catch (_error) {
      // If custom config fails to load, just return contrib config
      spinner.info("No custom servers found");
      return mergedContribConfig;
    }
  } catch (error) {
    spinner.fail("Failed to load configuration");
    console.error(chalk.red("Error loading server config:"), error);
    throw error;
  }
}

/**
 * Loads and verifies the server configuration
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

/**
 * Updates server configuration with correct npx paths and starts the server
 */
export async function updateServerPaths(npxInfo: {
  cmd: string;
  args: string[];
}): Promise<void> {
  printSection("Updating Server Paths");

  const spinner = ora({
    text: "Updating server executable paths...",
    color: "cyan",
  }).start();

  try {
    // Get the current API key
    const apiKey = process.env.SYSTEMPROMPT_API_KEY;
    if (!apiKey) {
      throw new Error("API key not found in environment");
    }

    // Get current config from API
    const response = await fetch("http://127.0.0.1/v1/mcp", {
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load config: ${response.statusText}`);
    }

    const config = (await response.json()) as ConfigData;

    console.log(chalk.gray("\nServer configurations before update:"));
    Object.entries(config.mcpServers || {}).forEach(([name, server]) => {
      console.log(chalk.gray(`  ${name}:`));
      console.log(chalk.gray(`    command: ${server.command || "undefined"}`));
      console.log(chalk.gray(`    args: ${JSON.stringify(server.args || [])}`));
    });

    // Update npx path in all server configurations
    Object.entries(config.mcpServers || {}).forEach(([name, server]) => {
      // For core servers (systemprompt-mcp-*), always set the npx command
      if (name.startsWith("systemprompt-mcp-")) {
        const oldCommand = server.command;
        const oldArgs = [...(server.args || [])];

        server.command = npxInfo.cmd;
        server.args = [
          ...npxInfo.args.slice(0, -1),
          ...(server.args?.slice?.(1) || []),
        ];

        console.log(chalk.gray(`\nUpdating core server "${name}":`));
        console.log(chalk.gray(`  Before:`));
        console.log(chalk.gray(`    command: ${oldCommand || "undefined"}`));
        console.log(chalk.gray(`    args: ${JSON.stringify(oldArgs)}`));
        console.log(chalk.gray(`  After:`));
        console.log(chalk.gray(`    command: ${server.command}`));
        console.log(chalk.gray(`    args: ${JSON.stringify(server.args)}`));
      } else if (server.command?.includes("npx")) {
        // For other servers, only update if they use npx
        const oldCommand = server.command;
        const oldArgs = [...(server.args || [])];

        server.command = npxInfo.cmd;
        server.args = [
          ...npxInfo.args.slice(0, -1),
          ...(server.args?.slice?.(1) || []),
        ];

        console.log(chalk.gray(`\nUpdating npx server "${name}":`));
        console.log(chalk.gray(`  Before:`));
        console.log(chalk.gray(`    command: ${oldCommand}`));
        console.log(chalk.gray(`    args: ${JSON.stringify(oldArgs)}`));
        console.log(chalk.gray(`  After:`));
        console.log(chalk.gray(`    command: ${server.command}`));
        console.log(chalk.gray(`    args: ${JSON.stringify(server.args)}`));
      }
    });

    spinner.succeed("Server paths updated");

    // Send updated config to API
    const updateResponse = await fetch("http://127.0.0.1/v1/mcp", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    if (!updateResponse.ok) {
      throw new Error(`Failed to update config: ${updateResponse.statusText}`);
    }
  } catch (error) {
    spinner.fail("Failed to update server paths");
    console.error(chalk.red("Error updating server paths:"), error);
    throw error;
  }
}
