import { Button } from "@nextui-org/react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useAgentRegistry, AgentConfig } from "@/features/agent-registry";
import { AgentCard } from "@/components/Card/AgentCard";

export default function AgentGalleryPage() {
  const { agents, activeAgent, setActiveAgent } = useAgentRegistry();
  const navigate = useNavigate();

  const handleCreateAgent = () => {
    navigate("/agent/create");
  };

  const handleSetActive = (agent: AgentConfig) => {
    setActiveAgent(agent.id);
  };

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
      <div className="flex flex-col gap-6">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isActive={agent.id === activeAgent}
            onSetActive={handleSetActive}
          />
        ))}
      </div>
    </div>
  );
}
