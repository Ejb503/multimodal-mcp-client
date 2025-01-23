import { SystempromptAgent } from "@/types/systemprompt";
import { AgentConfig } from "./types";
import { Resource } from "@modelcontextprotocol/sdk/types.js";

export interface AgentCustomization {
  knowledge: string;
  voice: string;
  tools: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  resources: Resource[];
  dependencies: string[];
  config: {
    model: string;
    generationConfig: {
      responseModalities: "audio" | "image" | "text";
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: string;
          };
        };
      };
    };
  };
}

export interface AgentCustomizations {
  [agentId: string]: AgentCustomization;
}

const defaultCustomization: AgentCustomization = {
  knowledge: "",
  voice: "Kore",
  tools: [],
  resources: [],
  dependencies: [],
  config: {
    model: "models/gemini-2.0-flash-exp",
    generationConfig: {
      responseModalities: "audio",
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: "Kore",
          },
        },
      },
    },
  },
};

export function getAgentId(agent: SystempromptAgent): string {
  return `${agent.type}:${agent.id}`;
}

export function mapSystempromptAgentToConfig(
  agent: SystempromptAgent,
  customization?: AgentCustomization
): AgentConfig {
  const mergedCustomization = {
    ...defaultCustomization,
    ...customization,
  };

  return {
    name: agent.metadata.title,
    description: agent.metadata.description,
    instruction: agent.content,
    knowledge: mergedCustomization.knowledge,
    voice: mergedCustomization.voice,
    tools: mergedCustomization.tools,
    resources: mergedCustomization.resources,
    dependencies: mergedCustomization.dependencies,
    config: mergedCustomization.config,
  };
}

export function extractCustomizationFromConfig(
  agentId: string,
  config: AgentConfig
): { [key: string]: AgentCustomization } {
  const customization: AgentCustomization = {
    knowledge: config.knowledge,
    voice: config.voice,
    tools: config.tools,
    resources: config.resources,
    dependencies: config.dependencies,
    config: config.config,
  };

  return {
    [agentId]: customization,
  };
}

export function mergeCustomizations(
  existing: AgentCustomizations,
  newCustomizations: AgentCustomizations
): AgentCustomizations {
  return {
    ...existing,
    ...newCustomizations,
  };
}

// Storage utilities
const STORAGE_KEY = "agent-customizations";

export function loadStoredCustomizations(): AgentCustomizations {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Failed to load agent customizations:", error);
    return {};
  }
}

export function saveCustomizations(customizations: AgentCustomizations): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customizations));
  } catch (error) {
    console.error("Failed to save agent customizations:", error);
  }
}
