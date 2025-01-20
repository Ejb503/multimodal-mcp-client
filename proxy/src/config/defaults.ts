import { ServerDefaults } from "../types/index.js";

export const defaults: ServerDefaults = {
  serverTypes: {
    stdio: {
      icon: "solar:server-square-line-duotone",
      color: "primary",
      description: "Local MCP Server",
      serverType: "core",
    },
    sse: {
      icon: "solar:server-square-cloud-bold-duotone",
      color: "primary",
      description: "Remote SSE-based MCP Server",
      serverType: "core",
    },
  },
  unconnected: {
    icon: "solar:server-square-line-duotone",
    color: "warning",
    description: "Disconnected Server",
    serverType: "core",
  },
};
