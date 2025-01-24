import { SystempromptAgent, SystempromptModule } from "./systemprompt";

export interface ServerMetadata {
  icon?: string;
  color?: string;
  description?: string;
  serverType?: "core" | "custom";
  name?: string;
}

export interface ServerConfig {
  command: string;
  args: string[];
  env: Record<string, string>;
  metadata?: ServerMetadata;
}

export interface ServerDefaults {
  serverTypes: {
    stdio: ServerMetadata;
    sse: ServerMetadata;
  };
  unconnected: ServerMetadata;
}

export interface McpModuleMetadata {
  created: string;
  updated: string;
  version: number;
  status: string;
}

export interface McpData {
  mcpServers: Record<string, ServerConfig>;
  defaults: ServerDefaults;
  available: Record<string, SystempromptModule>;
  agents: SystempromptAgent[];
}
