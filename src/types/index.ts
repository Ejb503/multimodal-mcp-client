export interface McpServerConfig {
  command: string;
  args: string[];
  env?: string[];
  metadata?: {
    icon?: string;
    color?: string;
    description?: string;
  };
}

export interface McpData {
  mcpServers: Record<string, McpServerConfig>;
  customServers?: Record<string, McpServerConfig>;
  defaults?: {
    serverTypes?: Record<string, McpServerConfig["metadata"]>;
    unconnected?: McpServerConfig["metadata"];
  };
  sse?: Record<
    string,
    {
      url: string;
      apiKey: string;
    }
  >;
}
