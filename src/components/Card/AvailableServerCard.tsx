import { Chip, Button } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { BaseCard } from "./BaseCard";
import { useState } from "react";
import { ExternalLink } from "../Link/ExternalLink";
import { useMcpData } from "@/contexts/McpDataContext";

interface AvailableServerCardProps {
  serverId: string;
  title: string;
  description: string;
  icon: string;
  environmentVariables: string[];
  githubLink: string;
  npmLink: string;
  isInstalled?: boolean;
  className?: string;
}

/**
 * AvailableServerCard displays available MCP server information in a compact card layout
 */
export function AvailableServerCard({
  serverId,
  title,
  description,
  icon,
  environmentVariables,
  githubLink,
  npmLink,
  isInstalled = false,
  className = "",
}: AvailableServerCardProps) {
  const [isInstalling, setIsInstalling] = useState(false);
  const { installServer } = useMcpData();

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      await installServer(serverId);
    } catch (error) {
      console.error("Error installing server:", error);
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <BaseCard
      icon={icon}
      title={title}
      className={className}
      headerAction={
        isInstalled ? (
          <Chip
            size="sm"
            variant="dot"
            color="success"
            startContent={
              <Icon
                icon="solar:check-circle-bold-duotone"
                className="text-sm"
              />
            }
          >
            Installed
          </Chip>
        ) : (
          <Button
            size="sm"
            color="primary"
            variant="flat"
            onPress={handleInstall}
            isLoading={isInstalling}
            startContent={
              !isInstalling && (
                <Icon
                  icon="solar:download-square-bold-duotone"
                  className="text-lg"
                />
              )
            }
          >
            Install
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-default-500 line-clamp-2">{description}</p>

        <div className="flex flex-wrap gap-1">
          {environmentVariables.map((env) => (
            <Chip key={env} size="sm" variant="dot" color="warning">
              {env}
            </Chip>
          ))}
        </div>

        <div className="flex gap-2 mt-2">
          <ExternalLink href={githubLink} type="github" size="sm" />
          <div className="text-default-400">•</div>
          <ExternalLink href={npmLink} type="npm" size="sm" />
        </div>
      </div>
    </BaseCard>
  );
}
