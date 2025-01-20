#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { EventSource } from "eventsource";
import { parseArgs } from "node:util";
import type { McpConfig } from "./types/index.js";
import { ProxyServer } from "./server.js";
import { defaults } from "./config/defaults.js";

// Polyfill EventSource for SSE client in Node.js
declare global {
  // eslint-disable-next-line no-var
  var EventSource: typeof EventSource;
}
globalThis.EventSource = EventSource;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load configuration
const configPath = join(__dirname, "../../config/mcp.config.json");
const mcpConfig = JSON.parse(readFileSync(configPath, "utf-8")) as McpConfig;

// Ensure defaults are properly initialized
mcpConfig.defaults = mcpConfig.defaults || defaults;

// Parse command line arguments
const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port: { type: "string", default: "3000" },
  },
});

// Start server
const server = new ProxyServer(mcpConfig);
const port = parseInt(values.port as string, 10);

server.startServer(port).catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
