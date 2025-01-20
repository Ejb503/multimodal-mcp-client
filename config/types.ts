export interface ServerMetadata {
  name?: string;
  description?: string;
  icon?: string;
  color?: "success" | "warning" | "primary" | "secondary";
}

export interface StdioServerConfig {
  command: string;
  args: string[];
  env: string[];
  metadata?: ServerMetadata;
}

export interface McpConfig {
  mcpServers: Record<string, StdioServerConfig>;
}
