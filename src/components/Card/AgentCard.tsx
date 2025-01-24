import { Card, Button, ButtonGroup, Tooltip, Chip } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { AgentConfig } from "@/types/agent.types";
import { useState } from "react";

interface AgentCardProps {
  agent: AgentConfig;
  isActive?: boolean;
  onSetActive?: (agent: AgentConfig) => void;
  className?: string;
  showActions?: boolean;
}

export function AgentCard({
  agent,
  isActive = false,
  onSetActive,
  className = "",
  showActions = true,
}: AgentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const truncatedInstruction =
    agent.instruction.length > 150
      ? `${agent.instruction.slice(0, 150)}...`
      : agent.instruction;

  return (
    <Card
      className={`p-8 bg-default-50 shadow-xl border border-default-200 ${
        isActive ? "border-primary" : ""
      } ${className}`}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="text-2xl flex items-center gap-3">
              <Icon
                icon="solar:bot-line-duotone"
                className={`w-8 h-8 ${
                  isActive ? "text-primary" : "text-default-400"
                }`}
              />
              {agent.name}
              <Chip
                size="sm"
                variant="flat"
                color={agent._source === "user" ? "success" : "secondary"}
              >
                {agent._source === "user" ? "user" : "system"}
              </Chip>
            </h3>
            <p className="text-default-500 mt-1">{agent.description}</p>
          </div>
          {showActions && onSetActive && (
            <ButtonGroup>
              <Tooltip
                content={
                  isActive
                    ? "Currently active agent"
                    : "Start conversation with agent"
                }
              >
                <Button
                  color={isActive ? "success" : "primary"}
                  variant={isActive ? "flat" : "solid"}
                  onPress={() => onSetActive(agent)}
                  startContent={
                    <Icon
                      icon={
                        isActive
                          ? "solar:check-circle-bold-duotone"
                          : "solar:play-bold-duotone"
                      }
                      className="text-lg"
                    />
                  }
                >
                  {isActive ? "Active" : "Chat"}
                </Button>
              </Tooltip>
            </ButtonGroup>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-background rounded-lg p-4 border border-default-200">
            <div className="flex items-center gap-2 mb-2">
              <Icon
                icon="solar:user-id-bold-duotone"
                className={`text-xl ${
                  agent.name ? "text-success" : "text-warning"
                }`}
              />
              <h4 className="font-medium">Identity</h4>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-default-500">
                Name:{" "}
                <span className="text-default-700">
                  {agent.name || "Not set"}
                </span>
              </p>
              <p className="text-sm text-default-500">
                Description:{" "}
                <span className="text-default-700">
                  {agent.description || "Not set"}
                </span>
              </p>
            </div>
          </div>

          <div className="bg-background rounded-lg p-4 border border-default-200">
            <div className="flex items-center gap-2 mb-2">
              <Icon
                icon="solar:document-text-bold-duotone"
                className={`text-xl ${
                  agent.instruction ? "text-success" : "text-warning"
                }`}
              />
              <h4 className="font-medium">System Instructions</h4>
            </div>
            <div className="text-sm text-default-500 space-y-2">
              <p>{isExpanded ? agent.instruction : truncatedInstruction}</p>
              {agent.instruction.length > 150 && (
                <Button
                  size="sm"
                  variant="light"
                  onPress={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? "Show Less" : "Show More"}
                </Button>
              )}
            </div>
          </div>

          <div className="bg-background rounded-lg p-4 border border-default-200">
            <div className="flex items-center gap-2 mb-2">
              <Icon
                icon="solar:widget-bold-duotone"
                className={`text-xl ${
                  agent.tools.length > 0 ? "text-success" : "text-warning"
                }`}
              />
              <h4 className="font-medium">Capabilities</h4>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-default-500">
                Tools:{" "}
                <span className="text-default-700">
                  {agent.tools.length} selected
                </span>
              </p>
              <p className="text-sm text-default-500">
                Voice: <span className="text-default-700">Kore</span>
              </p>
              <p className="text-sm text-default-500">
                Response:{" "}
                <span className="text-default-700">Audio enabled</span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-default-200">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-8 h-8 rounded-full bg-success/10 border border-success flex items-center justify-center">
                <Icon
                  icon="solar:check-circle-bold-duotone"
                  className="text-lg text-success"
                />
              </div>
              <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary flex items-center justify-center">
                <Icon
                  icon="solar:shield-keyhole-minimalistic-bold-duotone"
                  className="text-lg text-primary"
                />
              </div>
              <div className="w-8 h-8 rounded-full bg-warning/10 border border-warning flex items-center justify-center">
                <Icon
                  icon="solar:bolt-circle-bold-duotone"
                  className="text-lg text-warning"
                />
              </div>
            </div>
            <div>
              <p className="font-medium">
                {isActive ? "Currently Active" : "Ready to Activate"}
              </p>
              <p className="text-default-500 text-sm">
                Secure, optimized, and ready to assist
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
