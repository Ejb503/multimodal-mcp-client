import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { McpHandlers } from "./handlers/mcpHandlers.js";
import { ConfigHandlers } from "./handlers/configHandlers.js";
import { TransportHandlers } from "./handlers/transportHandlers.js";
import { defaults } from "./config/defaults.js";
import type { McpConfig } from "./types/index.js";

export default function mcpProxy({
  transportToClient,
  transportToServer,
  onerror,
}: {
  transportToClient: Transport;
  transportToServer: Transport;
  onerror: (error: Error) => void;
}) {
  let transportToClientClosed = false;
  let transportToServerClosed = false;

  transportToClient.onmessage = (message) => {
    console.log("transportToClient.onmessage", message);
    transportToServer.send(message).catch(onerror);
  };

  transportToServer.onmessage = (message) => {
    console.log("transportToServer.onmessage", message);
    transportToClient.send(message).catch(onerror);
  };

  transportToClient.onclose = () => {
    console.log("transportToClient.onclose");
    if (transportToServerClosed) {
      return;
    }

    transportToClientClosed = true;
    transportToServer.close().catch(onerror);
  };

  transportToServer.onclose = () => {
    console.log("transportToServer.onclose");
    if (transportToClientClosed) {
      return;
    }
    transportToServerClosed = true;

    transportToClient.close().catch(onerror);
  };

  transportToClient.onerror = onerror;
  transportToServer.onerror = onerror;
}

export class McpProxy {
  private mcpHandlers: McpHandlers;
  private configHandlers: ConfigHandlers;
  private transportHandlers: TransportHandlers;

  constructor(config: McpConfig) {
    // Ensure defaults are properly initialized
    config.defaults = config.defaults || defaults;

    this.mcpHandlers = new McpHandlers(config);
    this.configHandlers = new ConfigHandlers(config);
    this.transportHandlers = new TransportHandlers(config);
  }
}
