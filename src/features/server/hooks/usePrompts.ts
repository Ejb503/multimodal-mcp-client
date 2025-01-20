import { useState, useContext } from "react";
import { McpContext } from "@/contexts/McpContext";
import type {
  Prompt,
  GetPromptResult,
  CreateMessageRequest,
  CreateMessageResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { JSONSchema7 } from "json-schema";
import { useServer } from "./useServer";

interface LlmExecutionObject {
  name: string;
  messages: GetPromptResult["messages"];
  params: JSONSchema7;
}

export interface UsePromptsReturn {
  prompts: Prompt[];
  selectedPrompt: GetPromptResult | null;
  isModalOpen: boolean;
  isLoading: boolean;
  parameters: JSONSchema7;
  validationErrors: Array<{ field: string; message: string }>;
  selectPrompt: (prompt: Prompt) => Promise<void>;
  updateParameter: (key: string, value: unknown) => void;
  getLlmExecutionObject: () => LlmExecutionObject | null;
  executeSamplingRequest: (
    request: CreateMessageRequest["params"]
  ) => Promise<CreateMessageResult>;
  fetchPromptWithArguments: () => Promise<void>;
  closeModal: () => void;
}

export function usePrompts(serverId: string): UsePromptsReturn {
  const context = useContext(McpContext);
  if (!context) throw new Error("usePrompts must be used within McpContext");

  const { actions } = useServer({ serverId });
  const [selectedPrompt, setSelectedPrompt] = useState<GetPromptResult | null>(
    null
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parameters, setParameters] = useState<JSONSchema7>({});
  const [validationErrors, setValidationErrors] = useState<
    Array<{ field: string; message: string }>
  >([]);

  // Get prompts from the client state
  const prompts = context.clients[serverId]?.prompts || [];

  const selectPrompt = async (prompt: Prompt) => {
    try {
      // Just set the selected prompt and open modal with existing data
      setSelectedPrompt({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
        messages: [], // Messages will be populated when executing with arguments
      });

      // Initialize parameters from the prompt's argument schema
      if (prompt.arguments) {
        const initialParams = Object.keys(prompt.arguments).reduce(
          (acc, key) => ({ ...acc, [key]: null }),
          {} as JSONSchema7
        );
        setParameters(initialParams);
      }

      setIsModalOpen(true);
    } catch (error) {
      console.error("Error selecting prompt:", error);
    }
  };

  const updateParameter = (key: string, value: unknown) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
    // Clear validation error for this field if it exists
    setValidationErrors((prev) => prev.filter((error) => error.field !== key));
  };

  const getLlmExecutionObject = (): LlmExecutionObject | null => {
    if (!selectedPrompt) return null;

    return {
      name: selectedPrompt.name as string,
      messages: selectedPrompt.messages,
      params: parameters,
    };
  };

  const executeSamplingRequest = async (
    request: CreateMessageRequest["params"]
  ): Promise<CreateMessageResult> => {
    setIsLoading(true);
    try {
      return await actions.executeSamplingRequest(request);
    } catch (error) {
      console.error("Error executing sampling request:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPromptWithArguments = async () => {
    setIsLoading(true);
    try {
      if (!selectedPrompt) throw new Error("No prompt selected");
      if (typeof selectedPrompt.name !== "string")
        throw new Error("Invalid prompt name");

      // Now that we have arguments, get the full prompt details
      const details = await actions.getPromptDetails({
        name: selectedPrompt.name,
        arguments: Object.entries(parameters).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: value != null ? String(value) : "",
          }),
          {} as Record<string, string>
        ),
      });

      // Update the prompt with full details including messages
      setSelectedPrompt(details);
    } catch (error) {
      console.error("Error fetching prompt with arguments:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPrompt(null);
    setParameters({});
    setValidationErrors([]);
  };

  return {
    prompts,
    selectedPrompt,
    isModalOpen,
    isLoading,
    parameters,
    validationErrors,
    selectPrompt,
    updateParameter,
    getLlmExecutionObject,
    executeSamplingRequest,
    fetchPromptWithArguments,
    closeModal,
  };
}
