import { useEffect, useState } from "react";
import { Card, CardBody, Button, Spinner } from "@nextui-org/react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAgentRegistry, AgentConfig } from "@/features/agent-registry";
import { AgentCard } from "@/components/Card/AgentCard";

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
  const { agents, loadAgents, activeAgent, setActiveAgent } =
    useAgentRegistry();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const init = async () => {
      try {
        await loadAgents();
      } catch (err) {
        console.error("Failed to load agents:", err);
        setError("Failed to load agents");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [loadAgents]);

  const handleCreateAgent = () => {
    navigate("/agent/create");
  };

  const handleEditAgent = (agent: AgentConfig) => {
    navigate(`/agent/edit/${agent.name}`);
  };

  const handleSetActive = (agent: AgentConfig) => {
    setActiveAgent(agent.name);
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

      {error ? (
        <Card className="bg-danger-50">
          <CardBody>
            <p className="text-danger">{error}</p>
          </CardBody>
        </Card>
      ) : agents.length === 0 ? (
        <EmptyState onCreateAgent={handleCreateAgent} />
      ) : (
        <div className="flex flex-col gap-6">
          {agents.map((agent) => (
            <AgentCard
              key={agent.name}
              agent={agent}
              onEdit={handleEditAgent}
              isActive={agent.name === activeAgent}
              onSetActive={handleSetActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}
