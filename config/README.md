# MCP Configuration

## Initial Setup

Before running the application, you need to set up your local configuration files:

1. In the `config` directory, create your local configuration files by removing the `.example` suffix from the template files and replacing with `.custom`:

   ```bash
   cp mcp.config.example.json mcp.config.custom.json
   cp agent.config.example.json agent.config.custom.json
   ```

2. Edit each configuration file according to your needs:
   - `mcp.config.json`: Configure your MCP server connections
   - `agent.config.json`: Set up your agent configurations

> Note: The `.example` files are templates tracked in git. Your local copies (without `.example`) are git-ignored to keep your settings private.

This directory contains configuration files for Model Context Protocol (MCP) servers and their connections. The configuration supports two types of MCP servers:

1. **SSE Servers** (`sse`): Remote servers that communicate directly via Server-Sent Events (SSE). [Coming Soon]
2. **stdio Servers** (`mcpServers`): Local servers that run as child processes and communicate through standard I/O.