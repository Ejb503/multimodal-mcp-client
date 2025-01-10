import { useNavigate, useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, Input, Textarea, Button, Checkbox } from "@nextui-org/react";
import { Icon } from "@iconify/react";
import { useAgentRegistry } from "@/features/agent-registry";
import { Tool, Resource } from "@modelcontextprotocol/sdk/types.js";
import { AgentCard } from "@/components/Card/AgentCard";

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

export default function AgentEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    saveAgent,
    tools: availableTools,
    getAgent,
    resources,
  } = useAgentRegistry();
  const isEditMode = !!id;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemInstruction, setSystemInstruction] = useState("");
  const [selectedTools, setSelectedTools] = useState<Tool[]>([]);
  const [selectedResources, setSelectedResources] = useState<Resource[]>([]);
  const [nameError, setNameError] = useState<string>("");
  const [loading, setLoading] = useState(isEditMode);

  // Load existing agent data if in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const agent = getAgent(id);
      if (agent) {
        setName(agent.name);
        setDescription(agent.description);
        setSystemInstruction(agent.instruction);
        // Map agent tools to available tools
        const agentTools = availableTools.filter((tool) =>
          agent.tools.some((agentTool) => agentTool.name === tool.name)
        );
        setSelectedTools(agentTools);
        setSelectedResources(agent.resources || []);
      }
      setLoading(false);
    }
  }, [isEditMode, id, getAgent, availableTools]);

  const handleResourceClick = (resource: Resource) => {
    const isSelected = selectedResources.some((r) => r.uri === resource.uri);
    if (isSelected) {
      setSelectedResources(
        selectedResources.filter((r) => r.uri !== resource.uri)
      );
    } else {
      setSelectedResources([...selectedResources, resource]);
    }
  };

  const handleSave = async () => {
    if (!name) {
      setNameError("Name is required");
      return;
    }
    setNameError("");

    try {
      await saveAgent({
        name,
        description,
        instruction: systemInstruction,
        knowledge: "", // No longer using separate knowledge field
        voice: "Kore", // Default voice
        tools: selectedTools.map((tool) => ({
          name: tool.name,
          description: tool.description || "",
          parameters: (tool.parameters || {}) as Record<string, unknown>,
        })),
        resources: selectedResources,
        dependencies: [],
        config: defaultConfig,
      });
      navigate("/");
    } catch (error) {
      console.error("Failed to save agent:", error);
    }
  };

  const previewAgent = {
    name: name || "[Agent Name]",
    description: description || "No description provided",
    instruction: systemInstruction,
    knowledge: "",
    voice: "Kore",
    tools: selectedTools.map((tool) => ({
      name: tool.name,
      description: tool.description || "",
      parameters: (tool.parameters || {}) as Record<string, unknown>,
    })),
    resources: selectedResources,
    dependencies: [],
    config: defaultConfig,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <Icon
            icon="solar:loading-bold-duotone"
            className="text-4xl animate-spin"
          />
          <p className="text-default-500">Loading agent configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {isEditMode ? "Edit Agent" : "Create Agent"}
        </h1>
        <Button
          color="default"
          variant="light"
          startContent={<Icon icon="solar:arrow-left-line-duotone" />}
          onPress={() => navigate("/")}
        >
          Back
        </Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSave();
        }}
        className="flex flex-col gap-6"
      >
        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="text-xl mb-4">Basic Information</h2>
          <div className="flex flex-col gap-4">
            <Input
              label="Name"
              placeholder="Enter a unique name for your agent"
              description="A unique identifier for your agent"
              value={name}
              onChange={(e) => setName(e.target.value)}
              errorMessage={nameError}
              isInvalid={!!nameError}
              isDisabled={isEditMode} // Name cannot be changed in edit mode
            />
            <Input
              label="Description"
              placeholder="Describe what your agent does"
              description="A brief summary of your agent's purpose and capabilities"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </Card>

        {/* System Instructions */}
        <Card className="p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl">System Instructions</h2>
              <p className="text-small text-default-500">
                Define how your agent should behave and what it knows
              </p>
            </div>
            <Textarea
              placeholder="Define your agent's personality, behavior, and knowledge..."
              description="Include any specific instructions, knowledge, or context that guides your agent's responses"
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              minRows={6}
              classNames={{
                input: "font-mono text-sm",
              }}
            />
          </div>
        </Card>

        {/* Tools */}
        <Card className="p-6">
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl">Tools</h2>
              <p className="text-small text-default-500">
                Select the capabilities your agent will have access to
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableTools.map((tool) => (
                <Checkbox
                  key={tool.name}
                  classNames={{
                    wrapper: "mt-0",
                  }}
                  isSelected={selectedTools.some((t) => t.name === tool.name)}
                  onChange={() => {
                    const isSelected = selectedTools.some(
                      (t) => t.name === tool.name
                    );
                    if (isSelected) {
                      setSelectedTools(
                        selectedTools.filter((t) => t.name !== tool.name)
                      );
                    } else {
                      setSelectedTools([...selectedTools, tool]);
                    }
                  }}
                >
                  <div className="flex flex-col">
                    <span className="text-small font-medium">{tool.name}</span>
                    <span className="text-tiny text-default-400">
                      {tool.description}
                    </span>
                  </div>
                </Checkbox>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl">Resources</h2>
                <p className="text-small text-default-500">
                  Select the resources your agent will have access to
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resources.map((resource) => (
                <Checkbox
                  key={resource.uri}
                  classNames={{
                    wrapper: "mt-0",
                  }}
                  isSelected={selectedResources.some(
                    (r) => r.uri === resource.uri
                  )}
                  onChange={() => handleResourceClick(resource)}
                >
                  <div className="flex flex-col">
                    <span className="text-small font-medium">
                      {resource.name}
                    </span>
                    {resource.description && (
                      <span className="text-tiny text-default-400">
                        {resource.description}
                      </span>
                    )}
                    {typeof resource.type === "string" && (
                      <span className="text-tiny text-default-400">
                        Type: {resource.type}
                      </span>
                    )}
                  </div>
                </Checkbox>
              ))}
            </div>
          </div>
        </Card>

        {/* Save Configuration */}
        <AgentCard
          agent={previewAgent}
          onSave={handleSave}
          isDisabled={!name}
          showActions={false}
        />
      </form>
    </div>
  );
}
