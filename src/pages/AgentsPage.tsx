import { useEffect, useState } from "react";
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Spinner,
  ButtonGroup,
  Tooltip,
} from "@nextui-org/react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAgentRegistry, AgentConfig } from "@/features/agent-registry";

interface AgentCardProps {
  agent: AgentConfig;
  onEdit: (agent: AgentConfig) => void;
  isActive: boolean;
  onSetActive: (agent: AgentConfig) => void;
}

function AgentCard({ agent, onEdit, isActive, onSetActive }: AgentCardProps) {
  return (
    <Card
      className={`hover:shadow-lg transition-shadow ${
        isActive ? "border-2 border-primary" : ""
      }`}
    >
      <CardHeader className="flex gap-3">
        <Icon
          icon="solar:bot-line-duotone"
          className={`w-8 h-8 ${
            isActive ? "text-primary" : "text-default-400"
          }`}
        />
        <div className="flex flex-col flex-1">
          <p className="text-md font-medium">{agent.name}</p>
          <p className="text-small text-default-400">{agent.description}</p>
        </div>
      </CardHeader>
      <CardBody>
        <div className="flex flex-col gap-4">
          {/* Agent Details */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-small text-default-400">
              <Icon icon="solar:widget-line-duotone" />
              <span>{agent.tools.length} tools</span>
            </div>
          </div>

          {/* Preview of System Instructions */}
          <div className="bg-default-50 rounded-lg p-3 text-tiny text-default-600 font-mono">
            {agent.instruction
              ? agent.instruction.slice(0, 100) + "..."
              : "No instructions set"}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <ButtonGroup>
              <Tooltip content="Edit agent configuration">
                <Button
                  variant="flat"
                  onPress={() => onEdit(agent)}
                  startContent={
                    <Icon icon="solar:pen-bold-duotone" className="text-lg" />
                  }
                >
                  Edit
                </Button>
              </Tooltip>
              <Tooltip
                content={
                  isActive ? "Currently active agent" : "Set as active agent"
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
                          : "solar:shield-check-bold-duotone"
                      }
                      className="text-lg"
                    />
                  }
                  isDisabled={isActive}
                >
                  {isActive ? "Active" : "Set Active"}
                </Button>
              </Tooltip>
            </ButtonGroup>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function EmptyState({ onCreateAgent }: { onCreateAgent: () => void }) {
  return (
    <Card className="bg-default-50">
      <CardBody className="text-center py-8">
        <Icon
          icon="solar:user-rounded-line-duotone"
          className="w-12 h-12 mx-auto mb-4 text-default-400"
        />
        <p className="text-default-600">No agents available</p>
        <p className="text-small text-default-400 mb-4">
          Create your first agent to get started
        </p>
        <Button
          color="primary"
          variant="flat"
          startContent={<Icon icon="solar:add-circle-line-duotone" />}
          onPress={onCreateAgent}
          size="sm"
        >
          Create Agent
        </Button>
      </CardBody>
    </Card>
  );
}

export default function AgentGalleryPage() {
  const { agents, activeAgent, setActiveAgent } = useAgentRegistry();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Set loading to false after initial render
    setLoading(false);
  }, []);

  const handleCreateAgent = () => {
    navigate("/agent/create");
  };

  const handleEditAgent = (agent: AgentConfig) => {
    navigate(`/agent/edit/${agent.name}`);
  };

  const handleSetActive = (agent: AgentConfig) => {
    setActiveAgent(agent.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl ">Agent Gallery</h1>
          <p className="text-small text-default-500">
            Manage and interact with your AI agents
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Icon icon="solar:add-circle-line-duotone" />}
          onPress={handleCreateAgent}
        >
          Create Agent
        </Button>
      </div>

      {agents.length === 0 ? (
        <EmptyState onCreateAgent={handleCreateAgent} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.name}
              agent={agent}
              onEdit={handleEditAgent}
              isActive={agent.id === activeAgent}
              onSetActive={handleSetActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
