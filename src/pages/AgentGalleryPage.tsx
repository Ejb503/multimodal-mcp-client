import { useAgentRegistry, AgentConfig } from "@/features/agent-registry";
import { AgentCard } from "@/components/Card/AgentCard";

export default function AgentGalleryPage() {
  const { agents, activeAgent, setActiveAgent } = useAgentRegistry();
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
