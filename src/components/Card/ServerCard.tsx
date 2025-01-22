import { BaseCard, BaseCardProps } from "./BaseCard";

export interface ServerCardProps extends Omit<BaseCardProps, "title" | "icon"> {
  serverName: string;
  serverId: string;
  isConnected: boolean;
}

export function ServerCard({
  serverName,
  serverId,
  isConnected,
  className = "",
  ...props
}: ServerCardProps) {
  return (
    <BaseCard
      icon="solar:server-line-duotone"
      iconClassName={isConnected ? "text-primary" : "text-default-400"}
      iconTestId={`server-icon-${isConnected ? "connected" : "disconnected"}`}
      title={
        <div className="flex items-center gap-3">
          <h1 className="text-2xl ">{serverName}</h1>
        </div>
      }
      subtitle={
        <p className="text-default-500">
          Server ID:{" "}
          <code className="text-primary bg-primary-50/30 px-2 py-0.5 rounded">
            {serverId}
          </code>
        </p>
      }
      className={`w-full ${className}`}
      {...props}
    />
  );
}
