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

const printJson = (data: ConfigData | unknown) => {
  console.log(chalk.gray(JSON.stringify(data, null, 2)));
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
    // Get verified npx path
    const npxInfo = await checkNpxAvailability();

    // Default command and args that we know work from preflight check
    const defaultCommand = npxInfo.cmd;
    const defaultArgs = [
      ...npxInfo.args.slice(0, -1),
      "-y",
      "systemprompt-agent-server",
    ];

    // Create environment object with required variables
    const mapEnvironmentVars = (
      env: Record<string, unknown> = {}
    ): Record<string, string> => {
      const result: Record<string, string> = {};

      // Map environment variables from array-style to key-value pairs
      Object.entries(env).forEach(([key, value]) => {
        // If it's a numeric key, treat it as an array index pointing to an env var name
        if (!isNaN(Number(key)) && typeof value === "string") {
          // Get the actual value from process.env
          const envValue = process.env[value];
          if (envValue) {
            result[value] = envValue;
          }
        }
        // If it's a direct key-value pair, use it as is
        else if (typeof value === "string") {
          result[key] = value;
        }
      });

      return result;
    };

    // Default config with a working command
    const defaultConfig: McpConfig = {
      mcpServers: {
        default: {
          command: defaultCommand,
          args: defaultArgs,
          env: {
            "0": "SYSTEMPROMPT_API_KEY",
            "1": "NOTION_API_KEY",
          },
        },
      },
    };

    // Debug log the command and environment
    console.log(chalk.dim("\nServer Command:"));
    console.log(chalk.gray(`${defaultCommand} ${defaultArgs.join(" ")}`));
    console.log(chalk.dim("\nServer Environment:"));
    console.log(
      chalk.gray(
        JSON.stringify(
          mapEnvironmentVars(defaultConfig.mcpServers.default.env),
          null,
          2
        )
      )
    );

    try {
      const response = await fetch("http://127.0.0.1/v1/mcp", {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const config = (await response.json()) as McpConfig;

        // Ensure all servers use the verified command, args and environment variables
        if (config.mcpServers) {
          Object.entries(config.mcpServers).forEach(([serverId, server]) => {
            config.mcpServers[serverId] = {
              ...server,
              command: defaultCommand,
              args: defaultArgs,
              env: server.env || {
                "0": "SYSTEMPROMPT_API_KEY",
                "1": "NOTION_API_KEY",
              },
            };

            // Debug log each server's configuration
            console.log(chalk.dim(`\nServer Configuration for ${serverId}:`));
            console.log(
              chalk.gray(`Command: ${defaultCommand} ${defaultArgs.join(" ")}`)
            );
            console.log(chalk.gray("Environment:"));
            console.log(
              chalk.gray(
                JSON.stringify(
                  mapEnvironmentVars(config.mcpServers[serverId].env),
                  null,
                  2
                )
              )
            );
          });
        }

        spinner.succeed("Server configuration loaded from API");
        console.log(chalk.dim("\nServer Configuration:"));
        return config;
      }
    } catch {
      console.log(chalk.yellow("Using default configuration"));
    }

    spinner.succeed("Server configuration loaded");
    console.log(chalk.dim("\nDefault Configuration:"));
    printJson(defaultConfig);
    return defaultConfig;
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
    text: "Loading server configuration...",
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
      throw new Error(`Failed to load config: ${response.statusText}`);
    }

    const config = await response.json();
    printJson(config);
    spinner.succeed("User configuration loaded");
    return config;
  } catch (error) {
    spinner.fail("Failed to load configuration");
    console.error(chalk.red("Error loading server config:"), error);
    throw error;
  }
}

// /**
//  * Loads and verifies the server configuration
//  * @returns Promise that resolves when config is verified
//  */
// export async function loadAgentConfig(apiKey: string): Promise<McpConfig> {
//   printSection("Server Configuration");

//   const spinner = ora({
//     text: "Loading server configuration...",
//     color: "cyan",
//   }).start();

//   try {
//     const response = await fetch("http://127.0.0.1/v1/mcp", {
//       headers: {
//         "api-key": apiKey,
//         "Content-Type": "application/json",
//       },
//     });

//     if (!response.ok) {
//       throw new Error(`Failed to load config: ${response.statusText}`);
//     }

//     const config = await response.json();
//     spinner.succeed("Server configuration loaded");
//     return config;
//   } catch (error) {
//     spinner.fail("Failed to load configuration");
//     console.error(chalk.red("Error loading server config:"), error);
//     throw error;
//   }
// }

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

  // Use absolute paths and normalize for cross-platform compatibility
  const configPath = resolve(process.cwd(), "proxy/src/server.config.json");
  try {
    const existingConfig = JSON.parse(
      await fs.readFile(configPath, "utf8")
    ) as ConfigData;

    if (!existingConfig?.mcpServers) {
      spinner.warn("No MCP servers found in config");
      return;
    }

    // Update npx path in all server configurations
    Object.entries(existingConfig.mcpServers).forEach(([, server]) => {
      if (server?.command?.includes?.("npx")) {
        server.command = npxInfo.cmd;
        server.args = [
          ...npxInfo.args.slice(0, -1),
          ...(server.args?.slice?.(1) || []),
        ];
      }
    });

    await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2));
    spinner.succeed("Server paths updated");

    console.log(chalk.yellow("\nUpdated Configuration:"));
    printJson(existingConfig);

    // Setup process handlers
    setupProcessHandlers();

    // Start the server using tsx
    spinner.start("Starting server...");

    const indexPath = resolve(process.cwd(), "proxy/src/index.ts");

    const serverProcess = spawn(
      process.platform === "win32" ? "tsx.cmd" : "tsx",
      ["--tsconfig", "proxy/tsconfig.json", indexPath],
      {
        stdio: "inherit",
        shell: true,
        env: process.env,
      }
    );

    serverProcess.on("error", (err) => {
      spinner.fail("Failed to start server");
      console.error(chalk.red("Error starting server:"), err);
      process.exit(1);
    });

    spinner.succeed("Server started");
  } catch (error) {
    spinner.fail("Failed to update server paths");
    console.error(chalk.red("Error updating server paths:"), error);
    throw error;
  }
}
