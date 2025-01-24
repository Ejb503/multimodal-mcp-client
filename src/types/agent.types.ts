import { Tool, Resource } from "@modelcontextprotocol/sdk/types.js";
import { LiveConfig } from "./multimodal-live-types";

export interface PromptPost {
  instruction: {
    static: string;
    state: string;
    dynamic: string;
  };
  input: {
    name: string;
    description: string;
    type: string[];
    reference: string[];
  };
  output: {
    name: string;
    description: string;
    type: string[];
    reference: string[];
  };
  metadata: {
    title: string;
    description: string;
    tag: string[];
    log_message: string;
  };
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  instruction: string;
  tools: Array<{
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  }>;
  resources: Resource[];
  _source: "user" | "system";
}

export interface AgentRegistryContextType {
  agents: AgentConfig[];
  activeAgent: string | null;
  setActiveAgent: (agentName: string | null) => void;
  tools: Tool[];
  resources: Resource[];
  activeTools: Tool[];
  activeResources: Resource[];
  toggleTool: (tool: Tool) => void;
  toggleResource: (resource: Resource) => void;
  config: LiveConfig;
}
