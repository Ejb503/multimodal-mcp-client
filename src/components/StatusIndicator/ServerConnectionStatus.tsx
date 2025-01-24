import { Chip } from "@nextui-org/react";
import { Icon } from "@iconify/react";

type ConnectionStatus = "connected" | "pending" | "error" | "disconnected";

interface ServerConnectionStatusProps {
  status: ConnectionStatus;
  className?: string;
}

const statusConfig: Record<
  ConnectionStatus,
  {
    label: string;
    color: "success" | "warning" | "danger" | "default";
    icon: string;
  }
> = {
  connected: {
    label: "Connected",
    color: "success",
    icon: "solar:check-circle-bold-duotone",
  },
  pending: {
    label: "Connecting",
    color: "warning",
    icon: "solar:loading-bold-duotone",
  },
  error: {
    label: "Error",
    color: "danger",
    icon: "solar:shield-warning-bold-duotone",
  },
  disconnected: {
    label: "Disconnected",
    color: "default",
    icon: "solar:plug-circle-bold-duotone",
  },
};

export function ServerConnectionStatus({
  status,
  className = "",
}: ServerConnectionStatusProps) {
  const config = statusConfig[status];

  return (
    <Chip
      size="sm"
      variant="dot"
      color={config.color}
      startContent={
        <Icon
          icon={config.icon}
          className={`text-sm ${status === "pending" ? "animate-spin" : ""}`}
        />
      }
      className={className}
    >
      {config.label}
    </Chip>
  );
}
