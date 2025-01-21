#!/usr/bin/env node

import { config } from "dotenv";
import { EventSource } from "eventsource";
import { parseArgs } from "node:util";
import chalk from "chalk";
import { ProxyServer } from "./server.js";

// Load environment variables from .env file
config();

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
    port: { type: "string", default: "3000" },
  },
});

// Print banner
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
  printBanner();

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
        " ".repeat(Math.max(0, 57 - (error as Error).message.length)) +
        chalk.red("║")
    );
    console.error(
      chalk.red(
        "╚════════════════════════════════════════════════════════════════════╝\n"
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
