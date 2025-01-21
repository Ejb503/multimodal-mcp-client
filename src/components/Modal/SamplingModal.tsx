import { ContentModal } from "./ContentModal";
import type {
  CreateMessageRequest,
  CreateMessageResult,
} from "@modelcontextprotocol/sdk/types.js";
import { useState } from "react";
import { useGlobalLlm } from "@/contexts/LlmProviderContext";
import { McpMeta } from "@/types/mcp";

interface SamplingModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: CreateMessageRequest["params"];
  onApprove: (response: CreateMessageResult) => void;
  onReject: () => void;
}

export function SamplingModal({
  isOpen,
  onClose,
  request,
  onApprove,
  onReject,
}: SamplingModalProps) {
  const llmProvider = useGlobalLlm();
  const [isLoading, setIsLoading] = useState(false);
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      // Execute with LLM provider
      const result = await llmProvider.executePrompt({
        name: "sampling",
        messages: request.messages,
        params: {
          temperature: request.temperature,
          maxTokens: request.maxTokens,
          stopSequences: request.stopSequences,
        },
        _meta: request._meta as McpMeta,
      });
      console.log("LLM Result", result);
      // Create response object
      const response: CreateMessageResult = {
        role: "assistant",
        content: {
          type: "text",
          text: result,
        },
        model: "mcp-sampling",
      };

      onApprove(response);
    } catch (error) {
      console.error("Failed to execute sampling:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    onReject();
    onClose();
  };

  const sections = [
    {
      title: "Messages",
      content: {
        messages: request.messages.map((msg) => ({
          role: msg.role,
          text: "text" in msg.content ? msg.content.text : "",
        })),
      },
    },
    {
      title: "Parameters",
      content: {
        temperature: request.temperature,
        maxTokens: request.maxTokens,
        stopSequences: request.stopSequences?.join(", "),
        responseSchema: request._meta?.responseSchema
          ? JSON.stringify(request._meta.responseSchema, null, 2)
          : undefined,
      },
    },
  ];

  return (
    <ContentModal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Sampling Request"
      sections={sections}
      primaryAction={{
        label: "Execute",
        loadingLabel: "Executing...",
        onClick: handleSubmit,
        isLoading,
      }}
    />
  );
}
