import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import {
  AgentConfig,
  AgentRegistryContextType,
} from "../../../types/agent.types";
import { Resource, Tool } from "@modelcontextprotocol/sdk/types.js";
import { useMcp } from "@/contexts/McpContext";
import { mapToolsToGeminiFormat } from "@/features/multimodal-agent/utils/tool-mappers";
import { LiveConfig } from "@/types/multimodal-live-types";
import { useMcpAgent } from "@/contexts/McpDataContext";
import { SystempromptAgent } from "@/types/systemprompt";

const AgentRegistryContext = createContext<AgentRegistryContextType | null>(
  null
);

const mapMcpAgentToConfig = (agent: SystempromptAgent): AgentConfig => {
  return {
    id: agent.id,
    name: agent.metadata.title,
    description: agent.metadata.description,
    instruction: agent.content,
    tools: [], // Tools will be added from server context
    resources: [], // Resources will be added from server context
    _source: "user" as const,
  };
};

interface Props {
  children: ReactNode;
}

export function AgentRegistryProvider({ children }: Props) {
  const { clients, activeClients } = useMcp();
  const backendAgents = useMcpAgent();
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [activeTools, setActiveTools] = useState<Tool[]>([]);
  const [activeResources, setActiveResources] = useState<Resource[]>([]);

  const [config, setConfig] = useState<LiveConfig>({
    model: "models/gemini-2.0-flash-exp",
    generationConfig: {
      responseModalities: "audio",
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      },
    },
    systemInstruction: {
      parts: [{ text: "test" }],
    },
    tools: [{ googleSearch: {}, codeExecution: {} }],
  });

  useEffect(() => {
    if (!activeAgent && agents.length > 0) {
      // Find the first user-defined agent, or fall back to the first agent if none exists
      const defaultAgent =
        agents.find((a) => a._source === "user") || agents[0];
      if (defaultAgent) {
        setActiveAgent(defaultAgent.id);
      }
    }
  }, [agents, activeAgent]);

  useEffect(() => {
    const allTools = activeClients.reduce<Tool[]>((acc, clientId) => {
      const client = clients[clientId];
      if (client?.tools) {
        return [...acc, ...client.tools];
      }
      return acc;
    }, []);
    setTools(allTools);
    setActiveTools(allTools);
    setConfig((prevConfig: LiveConfig) => {
      const parsedTools = mapToolsToGeminiFormat(allTools);
      return {
        ...prevConfig,
        tools: [
          {
            googleSearch: {},
            codeExecution: {},
            functionDeclarations: parsedTools,
          },
        ],
      };
    });

    const allResources = activeClients.reduce<Resource[]>((acc, clientId) => {
      const client = clients[clientId];
      if (client?.resources) {
        return [...acc, ...client.resources];
      }
      return acc;
    }, []);
    setResources(allResources);
    setActiveResources(allResources);

    // Map and combine both server and backend agents
    const serverAgents = activeClients.reduce<AgentConfig[]>(
      (acc, clientId) => {
        const client = clients[clientId];
        if (client?.agents) {
          return [
            ...acc,
            ...client.agents.map((agent) => ({
              ...agent,
              _source: "system" as const,
            })),
          ];
        }
        return acc;
      },
      []
    );

    const mappedBackendAgents = backendAgents.map(mapMcpAgentToConfig);

    // Create a map of agents by ID, preferring user agents over system agents
    const uniqueAgents = new Map<string, AgentConfig>();
    const nameOccurrences = new Map<string, number>();

    // First add all user agents (from backend)
    mappedBackendAgents.forEach((agent) => {
      // Track name occurrences
      const count = nameOccurrences.get(agent.name) || 0;
      nameOccurrences.set(agent.name, count + 1);

      // Append suffix if name is duplicate
      const finalName = count > 0 ? `${agent.name} (${count + 1})` : agent.name;
      uniqueAgents.set(agent.id, { ...agent, name: finalName });
    });

    // Then add system agents, but only if an agent with that ID doesn't already exist
    serverAgents.forEach((agent) => {
      if (!uniqueAgents.has(agent.id)) {
        const count = nameOccurrences.get(agent.name) || 0;
        nameOccurrences.set(agent.name, count + 1);

        const finalName =
          count > 0 ? `${agent.name} (${count + 1})` : agent.name;
        uniqueAgents.set(agent.id, { ...agent, name: finalName });
      }
    });

    // Convert map back to array
    setAgents(Array.from(uniqueAgents.values()));
  }, [clients, activeClients, backendAgents]);

  // Update config when active agent changes
  useEffect(() => {
    if (activeAgent) {
      const agent = agents.find((a) => a.id === activeAgent);
      if (agent) {
        setConfig((prevConfig) => ({
          ...prevConfig,
          systemInstruction: {
            parts: [
              {
                text: agent.instruction,
              },
            ],
          },
        }));
      }
    }
  }, [activeAgent, agents, activeResources, activeTools]);

  const toggleTool = useCallback((tool: Tool) => {
    setActiveTools((prev) => {
      const isActive = prev.some((t) => t.name === tool.name);
      if (isActive) {
        return prev.filter((t) => t.name !== tool.name);
      } else {
        return [...prev, tool];
      }
    });
  }, []);

  const toggleResource = useCallback((resource: Resource) => {
    setActiveResources((prev) => {
      const isActive = prev.some((r) => r.uri === resource.uri);
      if (isActive) {
        return prev.filter((r) => r.uri !== resource.uri);
      } else {
        return [...prev, resource];
      }
    });
  }, []);

  return (
    <AgentRegistryContext.Provider
      value={{
        agents,
        activeAgent,
        setActiveAgent,
        tools,
        resources,
        activeTools,
        activeResources,
        toggleTool,
        toggleResource,
        config,
      }}
    >
      {children}
    </AgentRegistryContext.Provider>
  );
}

export function useAgentRegistry() {
  const context = useContext(AgentRegistryContext);
  if (!context) {
    throw new Error(
      "useAgentRegistry must be used within an AgentRegistryProvider"
    );
  }
  return context;
}
