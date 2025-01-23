import { McpHandlers } from "./handlers/mcpHandlers.js";
import { ConfigHandlers } from "./handlers/configHandlers.js";
import { TransportHandlers } from "./handlers/transportHandlers.js";
import { defaults } from "./config/defaults.js";
export default function mcpProxy({ transportToClient, transportToServer, onerror, }) {
    let transportToClientClosed = false;
    let transportToServerClosed = false;
    transportToClient.onmessage = (message) => {
        transportToServer.send(message).catch(onerror);
    };
    transportToServer.onmessage = (message) => {
        transportToClient.send(message).catch(onerror);
    };
    transportToClient.onclose = () => {
        if (transportToServerClosed) {
            return;
        }
        transportToClientClosed = true;
        transportToServer.close().catch(onerror);
    };
    transportToServer.onclose = () => {
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
    constructor(config) {
        // Ensure all required properties are initialized
        const initializedConfig = {
            mcpServers: config.mcpServers || {},
            available: config.available || {},
            defaults: config.defaults || defaults,
        };
        this.mcpHandlers = new McpHandlers(initializedConfig);
        this.configHandlers = new ConfigHandlers(initializedConfig);
        this.transportHandlers = new TransportHandlers(initializedConfig);
    }
}
