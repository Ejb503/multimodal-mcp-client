import { ServerHeader } from "@/features/server/components/sections/ServerHeader";
import { ServerDetails } from "@/features/server/components/sections/ServerDetails";
import { useMcp } from "@/contexts/McpContext";

interface McpServerCardProps {
  serverId: string;
  command: string;
  args: string[];
  env: string[];
  additionalInfo?: {
    github_link?: string;
    npm_link?: string;
    content?: string;
    title?: string;
    description?: string;
    environment_variables?: string[];
  };
  className?: string;
}

/**
 * McpServerCard displays MCP server information in a standardized card layout
 */
export function McpServerCard({
  serverId,
  command,
  args,
  env,
  additionalInfo,
  className = "",
}: McpServerCardProps) {
  const { clients, connectServer, disconnectServer } = useMcp();
  const clientState = clients[serverId];
  const isConnected = clientState?.connectionStatus === "connected";
  const isConnecting = clientState?.connectionStatus === "pending";
  const hasError = clientState?.connectionStatus === "error";

  const handleConnect = async () => {
    await connectServer(serverId);
  };

  const handleDisconnect = async () => {
    await disconnectServer(serverId);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <ServerHeader
        serverName={additionalInfo?.title || serverId}
        serverId={serverId}
        isConnected={isConnected}
        isConnecting={isConnecting}
        hasError={hasError}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
      />

      <ServerDetails
        command={command}
        args={args}
        env={env}
        additionalInfo={additionalInfo}
      />
    </div>
  );
}
