import { Chip, Button, Tooltip } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { BaseCard } from "./BaseCard";
import { useState, useMemo } from "react";
import { ExternalLink } from "../Link/ExternalLink";
import { useMcpData } from "@/contexts/McpDataContext";
import { clsx } from "clsx";

interface AvailableServerCardProps {
  id: string; // UUID from the backend
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
  id,
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

  // Check which environment variables are missing
  const { missingEnvVars, envVarStatus } = useMemo(() => {
    const status = environmentVariables.map((envVar) => {
      // For each env var, check both with and without VITE_ prefix
      const hasViteVar = !!import.meta.env[`VITE_${envVar}`];
      const hasEnvVar = !!import.meta.env[envVar];

      // Special case for API key which can be in either form
      const isApiKey = envVar === "SYSTEMPROMPT_API_KEY";
      const hasViteApiKey = !!import.meta.env.VITE_SYSTEMPROMPT_API_KEY;
      const hasApiKey = !!import.meta.env.SYSTEMPROMPT_API_KEY;

      const exists = isApiKey
        ? hasViteApiKey || hasApiKey
        : hasViteVar || hasEnvVar;

      return {
        name: envVar,
        exists,
        value: isApiKey
          ? hasViteApiKey
            ? import.meta.env.VITE_SYSTEMPROMPT_API_KEY
            : import.meta.env.SYSTEMPROMPT_API_KEY
          : hasViteVar
          ? import.meta.env[`VITE_${envVar}`]
          : import.meta.env[envVar],
      };
    });

    return {
      missingEnvVars: status.filter((s) => !s.exists).map((s) => s.name),
      envVarStatus: status,
    };
  }, [environmentVariables]);

  const canInstall = missingEnvVars.length === 0;

  const handleInstall = async () => {
    if (!canInstall) return;
    setIsInstalling(true);
    try {
      await installServer(id);
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
          <Tooltip
            content={
              !canInstall
                ? `Missing keys: ${missingEnvVars
                    .map((key) => `"${key}"`)
                    .join(", ")}`
                : "Click to install"
            }
            placement="top"
            delay={0}
            closeDelay={0}
            classNames={{
              content: clsx(
                "px-2 py-1 text-tiny font-medium",
                canInstall ? "bg-default-100" : "bg-danger/10 text-danger"
              ),
            }}
          >
            <Button
              size="sm"
              color={canInstall ? "primary" : "danger"}
              variant="flat"
              onPress={handleInstall}
              isDisabled={!canInstall}
              isLoading={isInstalling}
              startContent={
                !isInstalling && (
                  <Icon
                    icon={
                      canInstall
                        ? "solar:download-square-bold-duotone"
                        : "solar:shield-warning-bold-duotone"
                    }
                    className="text-lg"
                  />
                )
              }
            >
              {canInstall ? "Install" : "Missing Env"}
            </Button>
          </Tooltip>
        )
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-default-500 line-clamp-2">{description}</p>

        <div className="flex flex-wrap gap-1">
          {envVarStatus.map(({ name, exists }) => (
            <Tooltip
              key={name}
              content={
                exists ? "Environment variable found" : `Missing: "${name}"`
              }
              placement="top"
              delay={0}
              closeDelay={0}
              classNames={{
                content: clsx(
                  "px-2 py-1 text-tiny font-medium",
                  exists ? "bg-success-50/10" : "bg-danger-50/10"
                ),
              }}
            >
              <Chip
                size="sm"
                variant={exists ? "flat" : "bordered"}
                classNames={{
                  base: clsx(
                    exists
                      ? "bg-success-50/10 text-success border-success-500/20"
                      : "bg-danger-50/10 text-danger border-danger-500/20"
                  ),
                  content: "font-medium",
                }}
                startContent={
                  <Icon
                    icon={
                      exists
                        ? "solar:check-circle-bold-duotone"
                        : "solar:close-circle-bold-duotone"
                    }
                    className={clsx(
                      "text-sm",
                      exists ? "text-success" : "text-danger"
                    )}
                  />
                }
              >
                {name}
              </Chip>
            </Tooltip>
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
