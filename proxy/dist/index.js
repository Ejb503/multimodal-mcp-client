#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { EventSource } from "eventsource";
import { parseArgs } from "node:util";
import { config as loadEnv } from "dotenv";
import { ProxyServer } from "./server.js";
import { loadMcpConfig } from "./mcpProxy.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Load environment variables from .env file
const envPath = join(__dirname, "../../.env");
console.log("Looking for .env file at:", envPath);
const envResult = loadEnv({ path: envPath });
console.log("Loaded .env file:", envResult.parsed ? "success" : "not found");
console.log("VITE_SYSTEMPROMPT_API_KEY:", process.env.VITE_SYSTEMPROMPT_API_KEY ? "present" : "missing");
globalThis.EventSource = EventSource;
// Load configuration
console.log("\n=== Initial Config Loading ===");
let mcpConfig;
try {
    mcpConfig = await loadMcpConfig();
    console.log("Loaded config servers:", Object.keys(mcpConfig.mcpServers));
}
catch (error) {
    console.error("Error loading config:", error);
    process.exit(1);
}
// Parse command line arguments
const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
        port: { type: "string", default: "3000" },
    },
});
// Start server
const server = new ProxyServer(mcpConfig);
const port = parseInt(values.port, 10);
server.startServer(port).catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});
