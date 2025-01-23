import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { AgentConfig, AgentRegistryContextType } from "../lib/types";
import { readAgentConfig, writeAgentConfig } from "@/utils/config";
import { Resource, Tool } from "@modelcontextprotocol/sdk/types.js";
import { LiveConfig } from "@/features/multimodal-agent/multimodal-live-types";
import { useMcp } from "@/contexts/McpContext";
import { mapToolsToGeminiFormat } from "@/features/multimodal-agent/utils/tool-mappers";

const AgentRegistryContext = createContext<AgentRegistryContextType | null>(
  null
);

interface Props {
  children: ReactNode;
}

const defaultConfig = {
  model: "models/gemini-2.0-flash-exp",
  generationConfig: {
    responseModalities: "audio" as const,
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: "Kore",
        },
      },
    },
  },
};

export function AgentRegistryProvider({ children }: Props) {
  const { clients, activeClients } = useMcp();
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
    tools: [{ googleSearch: {} }],
  });

  // Load agents
  const loadAgents = useCallback(async () => {
    try {
      const config = await readAgentConfig();
      const agentsWithConfig = (config.agents || []).map(
        (
          agent: Omit<AgentConfig, "config"> & {
            config?: AgentConfig["config"];
          }
        ) => ({
          ...agent,
          config: agent.config || defaultConfig,
        })
      );
      setAgents(agentsWithConfig);
      if (!activeAgent && agentsWithConfig.length > 0) {
        setActiveAgent(agentsWithConfig[0].name);
      }
    } catch (error) {
      console.error("Failed to load agent configuration:", error);
      setAgents([]);
      throw error;
    }
  }, [activeAgent]);

  // Update tools and resources from MCP
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
    setConfig((prevConfig) => {
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
    setActiveResources(allResources); // Set all resources as active by default
  }, [clients, activeClients]);

  // Update config when active tools/resources change
  useEffect(() => {
    if (activeAgent) {
      const agent = agents.find((a) => a.name === activeAgent);

      if (agent) {
        setConfig((prevConfig) => ({
          ...prevConfig,
          ...agent.config,
          systemInstruction: {
            parts: [
              {
                text: agent.instruction,
              },
              // {
              //   text: `The resources you have available are: ${JSON.stringify(
              //     activeResources,
              //     null,
              //     2
              //   )}`,
              // },
              // {
              //   text: `The tools you have available are: ${JSON.stringify(
              //     activeTools,
              //     null,
              //     2
              //   )}`,
              // },
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

  useEffect(() => {
    loadAgents().catch(console.error);
  }, [loadAgents]);

  const saveAgent = useCallback(
    async (agent: AgentConfig) => {
      try {
        const newAgents = agents.filter((a) => a.name !== agent.name);
        newAgents.push(agent);
        await writeAgentConfig({ agents: newAgents });
        setAgents(newAgents);
      } catch (error) {
        console.error("Failed to save agent:", error);
        throw error;
      }
    },
    [agents]
  );

  const deleteAgent = useCallback(
    async (agentName: string) => {
      try {
        const newAgents = agents.filter((a) => a.name !== agentName);
        await writeAgentConfig({ agents: newAgents });
        setAgents(newAgents);
      } catch (error) {
        console.error("Failed to delete agent:", error);
        throw error;
      }
    },
    [agents]
  );

  const getAgent = useCallback(
    (agentName: string) => {
      return agents.find((a) => a.name === agentName) || null;
    },
    [agents]
  );

  return (
    <AgentRegistryContext.Provider
      value={{
        agents,
        activeAgent,
        loadAgents,
        saveAgent,
        deleteAgent,
        getAgent,
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
