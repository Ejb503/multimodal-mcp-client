#!/usr/bin/env node

import { config } from "dotenv";
import { EventSource } from "eventsource";
import { parseArgs } from "node:util";
import chalk from "chalk";
import { ProxyServer } from "./server.js";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from root .env file
const envPath = path.resolve(__dirname, "../../.env");
config({ path: envPath });

// Polyfill EventSource for SSE client in Node.js
declare global {
  // eslint-disable-next-line no-var
  var EventSource: typeof EventSource;
}
globalThis.EventSource = EventSource;

// Parse command line arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: {
      type: "string",
      short: "p",
      default: "3000",
    },
  },
});

function printBanner() {
  const version = "v0.3.13"; // TODO: Get this from package.json
  console.log(chalk.cyan("\n┌" + "─".repeat(60) + "┐"));
  console.log(
    chalk.cyan("│") +
      " ".repeat(15) +
      chalk.bold("Systemprompt MCP Server") +
      " ".repeat(15) +
      chalk.dim(version) +
      " ".repeat(3) +
      chalk.cyan("│")
  );
  console.log(chalk.cyan("└" + "─".repeat(60) + "┘\n"));
}

// Start server
export async function main() {
  // Copy VITE_ prefixed variables to their non-prefixed versions at the very start
  Object.entries(process.env).forEach(([key, value]) => {
    if (key.startsWith("VITE_") && value !== undefined) {
      const nonPrefixedKey = key.replace(/^VITE_/, "");
      if (!process.env[nonPrefixedKey]) {
        process.env[nonPrefixedKey] = value;
      }
    }
  });

  printBanner();

  // Print environment debug info
  console.log(chalk.cyan("\nEnvironment Debug Info:"));
  console.log(chalk.gray("─".repeat(60)));
  console.log(chalk.yellow("Looking for .env at:"), envPath);

  try {
    console.log(chalk.green("\n.env file contents:"));
  } catch (error) {
    console.log(
      chalk.red("\nCould not read .env file:"),
      (error as Error).message
    );
  }

  console.log(chalk.green("\nCurrent process.env:"));
  console.log("SYSTEMPROMPT_API_KEY:", process.env.SYSTEMPROMPT_API_KEY);
  console.log(chalk.gray("─".repeat(60)));

  try {
    const server = await ProxyServer.create();
    await server.startServer(parseInt(values.port));
  } catch (error) {
    console.error(
      "\n" +
        chalk.red(
          "╔═ Error ═══════════════════════════════════════════════════════════╗"
        )
    );
    console.error(
      chalk.red("║ ") +
        chalk.yellow("Failed to start server:") +
        " ".repeat(39) +
        chalk.red("║")
    );
    console.error(
      chalk.red("║ ") +
        chalk.white((error as Error).message) +
        " ".repeat(Math.max(0, 63 - (error as Error).message.length)) +
        chalk.red("║")
    );
    console.error(
      chalk.red(
        "╚═══════════════════════════════════════════════════════════════════╝"
      )
    );
    process.exit(1);
  }
}

const isMainModule =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"));
if (isMainModule) {
  main();
}
