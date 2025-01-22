import { Button } from "@nextui-org/react";
import { Icon } from "@iconify/react";

interface ServerHeaderProps {
  serverName: string;
  serverId: string;
  isConnected: boolean;
  isConnecting: boolean;
  hasError: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  icon?: string;
}

export function ServerHeader({
  serverName,
  serverId,
  isConnected,
  isConnecting,
  icon = "solar:server-bold-duotone",
  onConnect,
  onDisconnect,
}: ServerHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon icon={icon} className="text-xl text-primary" />
        <div>
          <h3 className="text-lg ">{serverName}</h3>
          <p className="text-sm text-default-500">{serverId}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isConnected ? (
          <Button
            color="danger"
            variant="flat"
            size="sm"
            onClick={onDisconnect}
            startContent={<Icon icon="solar:close-circle-bold-duotone" />}
          >
            Disconnect
          </Button>
        ) : (
          <Button
            color="success"
            variant="flat"
            size="sm"
            onClick={onConnect}
            isLoading={isConnecting}
            startContent={
              !isConnecting && <Icon icon="solar:play-circle-bold-duotone" />
            }
          >
            Connect
          </Button>
        )}
      </div>
    </div>
  );
}
